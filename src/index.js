import main from './main';

window.onload = function() {
    const canvas = document.getElementById('gl-canvas');
    const gl = canvas.getContext('webgl');
  
    // If 'gl' is null, then the browser does not support WebGL
    if (null == gl) {
        throw new Error('Your browser does not support WebGL Version 1');
    }

    main(gl);
};
