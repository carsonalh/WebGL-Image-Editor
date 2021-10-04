import { mat4 } from 'gl-matrix';
import { getCameraMatrix } from './camera';
import { getState, getAllState } from './state';

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

export interface Program {
    program: WebGLProgram;
    attribLocations: {
        vertexPosition: number;
        texCoordPosition: number;
    };
    uniformLocations: {
        projectionMatrix: WebGLUniformLocation;
        modelViewMatrix: WebGLUniformLocation;
        texture: WebGLUniformLocation;
    };
    buffers: {
        position: WebGLBuffer;
        texCoord: WebGLBuffer;
        indices: WebGLBuffer;
    };
    texture: WebGLTexture;
    updateScene: () => any;
    updateImageData: () => any;
    updateBuffers: () => any;
    render: () => any;
}

export function createProgram(gl: WebGLRenderingContext): Program | null {
    const shaderProgram = createShaderProgram(gl, vertexSource, fragmentSource);
    const buffers = createBuffers(gl);

    if (!shaderProgram || !buffers) {
        return null;
    }

    const projectionMatrix = gl.getUniformLocation(
        shaderProgram,
        'uProjectionMatrix'
    );

    const modelViewMatrix = gl.getUniformLocation(
        shaderProgram,
        'uModelViewMatrix'
    );

    const uniformTexture = gl.getUniformLocation(shaderProgram, 'uSampler');

    const texture = gl.createTexture();

    if (!projectionMatrix || !modelViewMatrix || !uniformTexture || !texture) {
        return null;
    }

    return {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(
                shaderProgram,
                'aVertexPosition'
            ),
            texCoordPosition: gl.getAttribLocation(
                shaderProgram,
                'aTextureCoord'
            ),
        },
        uniformLocations: {
            projectionMatrix,
            modelViewMatrix,
            texture: uniformTexture,
        },
        buffers,
        texture,
        updateBuffers: () => null,
        updateScene: () => null,
        updateImageData: () => null,
        render: () => null,
    };
}

function createShaderProgram(
    gl: WebGLRenderingContext,
    vertexSource: string,
    fragmentSource: string
) {
    const createShader = (
        gl: WebGLRenderingContext,
        type: number,
        source: string
    ) => {
        const shader = gl.createShader(type);

        if (!shader) {
            return null;
        }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(
                `Could not compile a shader:\n${gl.getShaderInfoLog(shader)}`
            );
        }

        return shader;
    };

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    const shaderProgram = gl.createProgram();

    if (!shaderProgram || !vertexShader || !fragmentShader) {
        return null;
    }

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        throw new Error(
            `Could not create the shader program:\n${gl.getProgramInfoLog(
                shaderProgram
            )}`
        );
    }

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return shaderProgram;
}

function createBuffers(gl: WebGLRenderingContext) {
    const positionBuffer = gl.createBuffer();
    const texCoordBuffer = gl.createBuffer();
    const elementBuffer = gl.createBuffer();

    if (!positionBuffer || !texCoordBuffer || !elementBuffer) {
        return null;
    }

    {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer);

        const indices = [
            // Assumes four elements of quad are defined clockwise, starting
            // from the top left
            0, 1, 2, 0, 2, 3,
        ];

        gl.bufferData(
            gl.ELEMENT_ARRAY_BUFFER,
            new Int16Array(indices),
            gl.STATIC_DRAW
        );
    }

    {
        const { imageWidth, imageHeight } = getState();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        const positions = [
            // Going clockwise
            // Top left
            -imageWidth / 2,
            imageHeight / 2,
            // Top right
            imageWidth / 2,
            imageHeight / 2,
            // Bottom right
            imageWidth / 2,
            -imageHeight / 2,
            // Bottom left
            -imageWidth / 2,
            -imageHeight / 2,
        ];

        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(positions),
            gl.DYNAMIC_DRAW
        );
    }

    {
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);

        const texCoords = [
            // Assuming positive y goes downwards
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
        ];

        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(texCoords),
            gl.DYNAMIC_DRAW
        );
    }

    return {
        position: positionBuffer,
        texCoord: texCoordBuffer,
        indices: elementBuffer,
    };
}

/**
 * Gets the dimensions of an image as fit to pass into WebGL.
 *
 * Because there are constraints on the image sizes that can be passed into
 * WebGL, we need a way to map arbitrary image sizes to WebGL-compatible image
 * sizes. This function finds the dimensions suitable to pass to WebGL given the
 * size of the actual image.
 */
export function getGlImageSize(
    actualWidth: number,
    actualHeight: number
): [width: number, height: number] {
    const maxLength = Math.max(actualWidth, actualHeight);

    let power = 1;

    while (power < maxLength) {
        power *= 2;
    }

    return [power, power];
}

export function updateScene(gl: WebGLRenderingContext, program: Program) {
    const { cameraX, cameraY, cameraScale } = getState();

    gl.useProgram(program.program);

    const modelViewMatrix = mat4.create();
    mat4.identity(modelViewMatrix);

    const projectionMatrix = getCameraMatrix({
        scale: cameraScale,
        width: gl.canvas.width,
        height: gl.canvas.height,
        x: cameraX,
        y: cameraY,
    });

    gl.uniformMatrix4fv(
        program.uniformLocations.projectionMatrix,
        false,
        projectionMatrix
    );
    gl.uniformMatrix4fv(
        program.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix
    );
}

export function updateBuffers(gl: WebGLRenderingContext, program: Program) {
    const { buffers } = program;

    {
        const { imageWidth, imageHeight } = getState();
        // Going clockwise
        const positions = [
            // Top left
            -imageWidth / 2,
            imageHeight / 2,
            // Top right
            imageWidth / 2,
            imageHeight / 2,
            // Bottom right
            imageWidth / 2,
            -imageHeight / 2,
            // Bottom left
            -imageWidth / 2,
            -imageHeight / 2,
        ];

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(positions),
            gl.DYNAMIC_DRAW
        );

        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;

        gl.vertexAttribPointer(
            program.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );
        gl.enableVertexAttribArray(program.attribLocations.vertexPosition);
    }

    {
        const { imageWidth, imageHeight, glWidth, glHeight } = getAllState();

        const widthPercent = imageWidth / glWidth;
        const heightPercent = imageHeight / glHeight;

        // Define the vertices clockwise, starting from top left
        const texCoords = [
            // Assuming positive y goes downwards

            // Top left
            0.0,
            0.0,
            // Top right
            widthPercent,
            0.0,
            // Bottom right
            widthPercent,
            heightPercent,
            // Bottom left
            0.0,
            heightPercent,
        ];
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texCoord);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(texCoords),
            gl.DYNAMIC_DRAW
        );
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.vertexAttribPointer(
            program.attribLocations.texCoordPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );
        gl.enableVertexAttribArray(program.attribLocations.texCoordPosition);
    }
}

export function updateImageData(gl: WebGLRenderingContext, program: Program) {
    const slot = 0;
    gl.activeTexture(gl.TEXTURE0 + slot);
    gl.bindTexture(gl.TEXTURE_2D, program.texture);

    const { glWidth, glHeight, glImageData } = getAllState();
    const [width, height] = [glWidth, glHeight];
    const buffer = new Uint8Array(glImageData);

    const level = 0;
    const internalFormat = gl.RGBA;
    const format = internalFormat;
    const border = 0;
    const type = gl.UNSIGNED_BYTE;
    gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        width,
        height,
        border,
        format,
        type,
        buffer
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.uniform1i(program.uniformLocations.texture, slot);
}

export function render(gl: WebGLRenderingContext, program: Program) {
    const { buffers } = program;

    gl.clearColor(0.15, 0.15, 0.15, 1.0);
    gl.clearDepth(1.0);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program.program);

    // There is a chance that these calls are unnecessary
    gl.enableVertexAttribArray(program.attribLocations.vertexPosition);
    gl.enableVertexAttribArray(program.attribLocations.texCoordPosition);

    {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

        const numElements = 6;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, numElements, gl.UNSIGNED_SHORT, offset);
    }
}
