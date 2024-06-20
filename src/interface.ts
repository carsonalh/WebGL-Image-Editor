import { DotTool, LineTool, Tool, ToolKey } from "./tool";
import store, { addCameraPosition, multiplyCameraScale, setLeftMouseDown, setRightMouseDown } from './store';
import { screenToWorld, screenToWorldUnits } from "./camera";
import { Program } from "./webgl";

const tools = {
    'dot': new DotTool(),
    'line': new LineTool(),
};

export interface MouseDownEvent {
    x: number;
    y: number;
    button: 'primary' | 'secondary' | 'middle';
}

export interface MouseUpEvent {
    x: number;
    y: number;
    button: 'primary' | 'secondary' | 'middle';
}

export interface MouseMoveEvent {
    x: number;
    y: number;
    deltaX: number;
    deltaY: number;
}

export interface MouseWheelEvent {
    deltaX: number;
    deltaY: number;
}

export function onMouseDown(canvas: HTMLCanvasElement, program: Program, e: MouseDownEvent) {
    store.dispatch(setLeftMouseDown(true));

    const [clickX, clickY] = [e.x, e.y];

    const { cameraScale, cameraX, cameraY, imageWidth, imageHeight } =
        store.getState().scene;
    const [worldX, worldY] = screenToWorld([clickX, clickY], canvas, {
        scale: cameraScale,
        width: (cameraScale * canvas.width) / canvas.height,
        height: cameraScale,
        x: cameraX,
        y: cameraY,
    });

    // TODO: Eventually clean this mess up; not now though...
    const createMapper =
        (
            fromStart: number,
            fromEnd: number,
            toStart: number,
            toEnd: number
        ) =>
        (x: number) => {
            // Get where x is from fromStart (0) to fromEnd (1) as a percentage
            const fromPercent = (x - fromStart) / (fromEnd - fromStart);
            // Apply that percentage to the 'to' range
            const to = toStart + fromPercent * (toEnd - toStart);
            return to;
        };

    const worldToPixelX = createMapper(
        -imageWidth / 2,
        imageWidth / 2,
        0,
        imageWidth
    );
    const worldToPixelY = createMapper(
        -imageHeight / 2,
        imageHeight / 2,
        imageHeight,
        0
    );

    const imageX = worldToPixelX(worldX);
    const imageY = worldToPixelY(worldY);

    console.log(`mouse down at (${imageX}, ${imageY})`);

    switch (e.button) {
        case 'primary': 
        switch (store.getState().scene.tool) {
            case 'dot': {
                tools['dot'].onMouseDown(imageX, imageY);
            }
            break;
            case 'line': {
                tools['line'].onMouseDown(imageX, imageY);
            }
            break;
        }
        break;
        case 'secondary': {
            store.dispatch(setRightMouseDown(true));
        }
        break;
    }

    program.updateImageData();
    program.render();
}

export function onMouseMove(canvas: HTMLCanvasElement, program: Program, e: MouseMoveEvent) {
    const [deltaX, deltaY] = [e.deltaX, e.deltaY];
    const { leftMouseDown, rightMouseDown } = store.getState().scene;

    const { cameraScale } = store.getState().scene;
    const [moveX, moveY] = screenToWorldUnits([deltaX, deltaY], canvas, {
        width: (cameraScale * canvas.width) / canvas.height,
        height: cameraScale,
        scale: cameraScale,
        x: store.getState().scene.cameraX,
        y: store.getState().scene.cameraY,
    });

    if (rightMouseDown) {
        store.dispatch(addCameraPosition({ x: moveX, y: moveY }));
    }

    if (leftMouseDown) {
        const { tool } = store.getState().scene;

        if (tool === 'line') {
            // update the line tool
            // add a tool tip
        } else if (tool === 'dot') {
            // update the dot tool, nothing to do really
        }
    }

    program.updateScene();
    program.render();
}

export function onMouseUp(canvas: HTMLCanvasElement, program: Program, e: MouseDownEvent) {
    const [clickX, clickY] = [e.x, e.y];
    const { cameraScale, cameraX, cameraY, imageWidth, imageHeight } =
        store.getState().scene;
    const [worldX, worldY] = screenToWorld([clickX, clickY], canvas, {
        scale: cameraScale,
        width: (cameraScale * canvas.width) / canvas.height,
        height: cameraScale,
        x: cameraX,
        y: cameraY,
    });

    const createMapper =
        (
            fromStart: number,
            fromEnd: number,
            toStart: number,
            toEnd: number
        ) =>
            (x: number) => {
                // Get where x is from fromStart (0) to fromEnd (1) as a percentage
                const fromPercent = (x - fromStart) / (fromEnd - fromStart);
                // Apply that percentage to the 'to' range
                const to = toStart + fromPercent * (toEnd - toStart);
                return to;
            };

    const worldToPixelX = createMapper(
        -imageWidth / 2,
        imageWidth / 2,
        0,
        imageWidth
    );
    const worldToPixelY = createMapper(
        -imageHeight / 2,
        imageHeight / 2,
        imageHeight,
        0
    );

    const imageX = worldToPixelX(worldX);
    const imageY = worldToPixelY(worldY);

    console.log(`mouse up at (${imageX}, ${imageY})`);

    const { tool } = store.getState().scene;

    if (e.button == 'secondary') {
        store.dispatch(setRightMouseDown(false));
    } else if (e.button == 'primary') {
        if (tool === 'line') {
            // draw the line on the image
            if (
                -imageWidth / 2 <= worldX &&
                worldX <= imageWidth / 2 &&
                -imageHeight / 2 <= worldY &&
                worldY <= imageHeight / 2
            ) {
                tools['line'].onMouseUp(imageX, imageY);
            }
        }
        store.dispatch(setLeftMouseDown(false));
    }

    program.updateImageData();
    program.render();
}

export function onMouseWheel(canvas: HTMLCanvasElement, program: Program, e: MouseWheelEvent) {
    if (e.deltaY !== 0) {
        const direction = Math.sign(e.deltaY);
        const scalePercentage = 1.0 + 0.07 * direction;
        store.dispatch(multiplyCameraScale(scalePercentage));

        program.updateScene();
        program.render();
    }
}
