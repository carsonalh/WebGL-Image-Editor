import { setupInput } from './input';
import {
    createProgram,
    render,
    updateBuffers,
    updateImageData,
    updateScene,
} from './webgl';

// TODO: move all this logic into index.ts
export default function main(gl: WebGLRenderingContext) {
    // This is the object containing the non-serializable WebGL references
    const program = createProgram(gl);

    if (!program) {
        throw new Error('Could not initialize the program');
    }

    program.updateImageData = () => updateImageData(gl, program);
    program.updateScene = () => updateScene(gl, program);
    program.updateBuffers = () => updateBuffers(gl, program);

    program.render = () => render(gl, program);

    // Sets up the input hooks
    setupInput(gl.canvas, program);

    program.updateScene();
    program.updateImageData();
    program.updateBuffers();
    program.render();
}
