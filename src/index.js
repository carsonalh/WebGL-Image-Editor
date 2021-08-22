import { mat4 } from 'gl-matrix';

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

void main() {
  gl_FragColor = vec4(vTextureCoord.x, vTextureCoord.y, 0.0, 1.0);
}
`;

window.onload = () => {
    const canvas = document.getElementById('gl-canvas');
    const gl = canvas.getContext('webgl');
  
    // If 'gl' is null, then the browser does not support WebGL
    if (null == gl) {
        throw new Error('Your browser does not support WebGL Version 1');
    }

    const programInfo = createProgram(gl, canvas);
    
    render(gl, programInfo);
};

function createProgram(gl, canvas) {
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
        },
        buffers,
        width: canvas.width,
        height: canvas.height
    };
}

function createShaderProgram(gl, vsSource, fsSource) {
    const createShader = (gl, type, source) => {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(`Could not compile a shader:\n${gl.getShaderInfoLog(shader)}`);
        }

        return shader;
    };

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

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

function render(gl, programInfo) {
    const { buffers } = programInfo;

    gl.clearColor(0.17, 0.14, 0.22, 1.0); 
    gl.clearDepth(1.0);                 

    gl.clear(gl.COLOR_BUFFER_BIT);

    const aspect = programInfo.width / programInfo.height;
    
    const projectionMatrix = mat4.create();

    {
        const left = - aspect;
        const right = aspect;
        const bottom = - 1;
        const top = 1;
        const near = -1;
        const far = 1;
        mat4.ortho(projectionMatrix, left, right, bottom, top, near, far);
    }

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

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

        const numElements = 6;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, numElements, gl.UNSIGNED_SHORT, offset);
    }
}
