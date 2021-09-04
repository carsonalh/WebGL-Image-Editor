import store from './store';
import { mat4 } from 'gl-matrix';
import { getCameraMatrix } from './camera';

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

export function createProgram(gl) {
    const shaderProgram = createShaderProgram(gl, vertexSource, fragmentSource);
    const buffers = createBuffers(gl);
    
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
        texture: gl.createTexture(),
        textureWidth: 1,
        textureHeight: 1
    };
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

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

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

export function render(gl, program) {
    const { buffers } = program;

    gl.clearColor(0.15, 0.15, 0.15, 1.0); 
    gl.clearDepth(1.0);                 

    gl.clear(gl.COLOR_BUFFER_BIT);

    const modelViewMatrix = mat4.create();
    mat4.identity(modelViewMatrix);
    
    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(program.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
        gl.enableVertexAttribArray(program.attribLocations.vertexPosition);
    }
    
    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texCoord);
        gl.vertexAttribPointer(program.attribLocations.texCoordPosition, numComponents, type, normalize, stride, offset);
        gl.enableVertexAttribArray(program.attribLocations.texCoordPosition);
    }
    
    gl.useProgram(program.program);

    const projectionMatrix = getCameraMatrix({
        scale: store.getState().scene.cameraScale,
        aspectRatio: gl.canvas.width / gl.canvas.height,
        x: store.getState().scene.cameraX,
        y: store.getState().scene.cameraY
    });

    gl.uniformMatrix4fv(program.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(program.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    
    {
        const slot = 0;
        gl.activeTexture(gl.TEXTURE0 + slot);
        gl.bindTexture(gl.TEXTURE_2D, program.texture);

        const { imageWidth: width, imageHeight: height } = store.getState().scene;
        const buffer = new Uint8Array(store.getState().scene.imageData);

        const level = 0;
        const internalFormat = gl.RGBA;
        const format = internalFormat;
        const border = 0;
        const type = gl.UNSIGNED_BYTE;
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, format, type, buffer);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);

        gl.uniform1i(program.uniformLocations.texture, slot);
    }

    {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

        const numElements = 6;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, numElements, gl.UNSIGNED_SHORT, offset);
    }
}
