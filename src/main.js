import { setupInput } from './input';
import { createProgram, render } from './webgl';

export default function main(gl) {
    // This is the object containing the non-serializable WebGL references
    const program = createProgram(gl);
    program.update = () => render(gl, program);
    // Sets up the input hooks
    setupInput(gl.canvas, program);
    // Do the first render; all renders after this are done by program.update()
    program.update();
}
