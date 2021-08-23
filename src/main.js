import { mat4 } from 'gl-matrix';
import Camera from './Camera';
import { setProgramInfo, getProgramInfo } from './programInfo';

export default function main(gl) {
    const programInfo = createProgram(gl);
    setProgramInfo(programInfo);
    render(gl);
}

const vertexSource = `
attribute vec4 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying highp vec2 vTextureCoord;

void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vTextureCoord = aTextureCoord;
}
`;

const fragmentSource = `
varying highp vec2 vTextureCoord;

uniform sampler2D uSampler;

void main() {
    gl_FragColor = texture2D(uSampler, vTextureCoord);
}
`;

function createProgram(gl) {
    const shaderProgram = createShaderProgram(gl, vertexSource, fragmentSource);
    const buffers = createBuffers(gl);
    const texture = createTexture(gl);

    return {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            texCoordPosition: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            texture: gl.getUniformLocation(shaderProgram, 'uSampler'),
        },
        buffers,
        texture
    };
}

function createTexture(gl) {
    const texture = gl.createTexture();
    const slot = 0;
    gl.activeTexture(gl.TEXTURE0 + slot);
    gl.bindTexture(gl.TEXTURE_2D, texture);
  
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 32;
    const height = 32;
    const border = 0;
    // According to the docs, this must be the same as 'internalFormat'
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D
    const format = internalFormat;
    const type = gl.UNSIGNED_BYTE;
    const pixels = [];
    for (let i = 0; i < width * height; ++i) {
        // RGBA opaque light gray
        pixels.push(0xFF, Math.floor(Math.random() * 0x100), 0x00, 0xFF);
    }
    const imageData = new Uint8Array(pixels);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, format, type, imageData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);

    // Unbind the texture
    gl.bindTexture(gl.TEXTURE_2D, null);

    return texture;
}

function createShaderProgram(gl, vertexSource, fragmentSource) {
    const createShader = (gl, type, source) => {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(`Could not compile a shader:\n${gl.getShaderInfoLog(shader)}`);
        }

        return shader;
    };

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        throw new Error(`Could not create the shader program:\n${gl.getProgramInfoLog(shaderProgram)}`);
    }

    return shaderProgram;
}

function createBuffers(gl) {
    const positionBuffer = gl.createBuffer();
    const texCoordBuffer = gl.createBuffer();
    const elementBuffer = gl.createBuffer();
    
    {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer);

        const indices = [
            // Assumes four elements of quad are defined clockwise, starting
            // from the top left
            0, 1, 2,
            0, 2, 3,            
        ];

        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(indices), gl.STATIC_DRAW);
    }

    {
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        const positions = [
            // Going clockwise
            -0.5, 0.5,
            0.5, 0.5,
            0.5, -0.5,
            -0.5, -0.5,
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    }

    {
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);

        const texCoords = [
            // Assuming positive y goes downwards
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    }

    return {
        position: positionBuffer,
        texCoord: texCoordBuffer,
        indices: elementBuffer
    };
}

function render(gl) {
    const programInfo = getProgramInfo();
    const { buffers } = programInfo;

    gl.clearColor(0.17, 0.14, 0.22, 1.0); 
    gl.clearDepth(1.0);                 

    gl.clear(gl.COLOR_BUFFER_BIT);

    const aspect = gl.canvas.width / gl.canvas.height;
    
    const camera = new Camera(aspect);

    const modelViewMatrix = mat4.create();
    mat4.identity(modelViewMatrix);
    
    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }
    
    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texCoord);
        gl.vertexAttribPointer(programInfo.attribLocations.texCoordPosition, numComponents, type, normalize, stride, offset);
        gl.enableVertexAttribArray(programInfo.attribLocations.texCoordPosition);
    }
    
    gl.useProgram(programInfo.program);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, camera.getProjectionMatrix());
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    
    {
        const textureSlot = 0;
        gl.activeTexture(gl.TEXTURE0 + textureSlot);
        gl.bindTexture(gl.TEXTURE_2D, programInfo.texture);
        gl.uniform1i(programInfo.uniformLocations.texture, textureSlot);
    }

    {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

        const numElements = 6;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, numElements, gl.UNSIGNED_SHORT, offset);
    }
}

