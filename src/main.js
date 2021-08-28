import { mat4 } from 'gl-matrix';
import { setProgramInfo, getProgramInfo } from './programInfo';
import { setupInput } from './input';
import createProgram from './createProgram';

export default function main(gl) {
    const program = createProgram(gl);
    program.update = () => {
        const download = document.getElementById('image-download');
        const blob = new Blob([program.textureSprite.buffer], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        if (download.href !== "#") {
            URL.revokeObjectURL(download.href);
        }
        download.download = "image-data.bin";
        download.href = url;

        render(gl);
    };
    setProgramInfo(program);
    setupInput(gl.canvas);
    render(gl);
}

function render(gl) {
    const program = getProgramInfo();
    const { buffers, camera, textureSprite: sprite } = program;

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

    gl.uniformMatrix4fv(program.uniformLocations.projectionMatrix, false, camera.getProjectionMatrix());
    gl.uniformMatrix4fv(program.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    
    {
        const slot = 0;
        gl.activeTexture(gl.TEXTURE0 + slot);
        gl.bindTexture(gl.TEXTURE_2D, program.texture);

        const level = 0;
        const internalFormat = gl.RGBA;
        const format = internalFormat;
        const { width, height } = sprite;
        const border = 0;
        const type = gl.UNSIGNED_BYTE;
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, format, type, sprite.buffer);
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

