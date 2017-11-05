let inPetriChannel = false;
function checkIfInPetri() {
  let messagesContainer = document.getElementById('messages_container');
  if (activeChannelNameButton && activeChannelNameButton.innerText === '#petri') {
    if (!inPetriChannel) {
      inPetriChannel = true;
      if (messagesContainer) {
        messagesContainer.classList.add('petri');
      }
    }
  } else {
    inPetriChannel = false;
    if (messagesContainer) {
      messagesContainer.classList.remove('petri');
    }
  }
}

const activeChannelChangedObserver = new MutationObserver((records) => {
  checkIfInPetri();
});

let activeChannelNameButton = null;
const pageBuildObserver = new MutationObserver((records) => {
  function registerActiveChannelNameButton(node) {
    activeChannelNameButton = node;
    activeChannelChangedObserver.observe(activeChannelNameButton, {
      childList: true,
      characterData: true,
      subtree: true
    });
    checkIfInPetri();
  }

  records.forEach((record) => {
    if (record.target.id === 'channel_title') {
      registerActiveChannelNameButton(record.target);
    }

    if (record.addedNodes) {
      record.addedNodes.forEach((node) => {
        if (node.id === 'channel_title') {
          registerActiveChannelNameButton(node);
        }
      });
    }
  });
  checkIfInPetri();
});
pageBuildObserver.observe(document.querySelector('html'), {
  childList: true,
  subtree: true
});
checkIfInPetri();

// webcam stuff
const webcamElement = document.createElement('div');
webcamElement.className = 'petri-webcam';
webcamElement.innerHTML = `
  <video class="original-webcam" width="320" height="240"></video>
  <canvas class="annotated-canvas" width="320" height="240"></canvas>
`;
document.querySelector('body').appendChild(webcamElement);

const video = document.querySelector('.petri-webcam .original-webcam');
const canvas = document.querySelector('.petri-webcam .annotated-canvas');
try {
  let attempts = 0;
  function readyListener(event) {
    findVideoSize();
  }
  function findVideoSize() {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      video.removeEventListener('loadeddata', readyListener);
      onDimensionsReady(video.videoWidth, video.videoHeight);
    } else {
      if (attempts < 10) {
        attempts++;
        setTimeout(findVideoSize, 200);
      } else {
        onDimensionsReady(320, 240);
      }
    }
  }
  function onDimensionsReady(width, height) {
    demo_app(width, height);
    window.requestAnimationFrame(tick);
  }

  video.addEventListener('loadeddata', readyListener);
  video.src = 'http://localhost:8000/webcam.webm';
  video.crossOrigin = '';
  video.autoplay = 'true';
} catch (error) {
  console.log('oh noo', error);
}

let ctx,canvasWidth,canvasHeight;
let img_u8,work_canvas,work_ctx;

const max_work_size = 160;

function demo_app(videoWidth, videoHeight) {
  canvasWidth  = canvas.width;
  canvasHeight = canvas.height;
  ctx = canvas.getContext('2d');

  ctx.fillStyle = "rgb(0,255,0)";
  ctx.strokeStyle = "rgb(0,255,0)";

  const scale = Math.min(max_work_size/videoWidth, max_work_size/videoHeight);
  const w = (videoWidth*scale)|0;
  const h = (videoHeight*scale)|0;

  img_u8 = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
  work_canvas = document.createElement('canvas');
  work_canvas.width = w;
  work_canvas.height = h;
  work_ctx = work_canvas.getContext('2d');

  jsfeat.bbf.prepare_cascade(jsfeat.bbf.face_cascade);
}

let lastTimeTwoFaces = null;

function tick() {
  window.requestAnimationFrame(tick);
  if (video.readyState === video.HAVE_ENOUGH_DATA) {

    ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

    work_ctx.drawImage(video, 0, 0, work_canvas.width, work_canvas.height);
    const imageData = work_ctx.getImageData(0, 0, work_canvas.width, work_canvas.height);

    jsfeat.imgproc.grayscale(imageData.data, work_canvas.width, work_canvas.height, img_u8);

    // possible options
    //jsfeat.imgproc.equalize_histogram(img_u8, img_u8);

    const pyr = jsfeat.bbf.build_pyramid(img_u8, 24*2, 24*2, 4);

    let rects = jsfeat.bbf.detect(pyr, jsfeat.bbf.face_cascade);
    rects = jsfeat.bbf.group_rectangles(rects, 2);

    // draw only most confident one and maybe some other
    draw_faces(ctx, rects, canvasWidth/img_u8.cols, 2);

    if (rects.length >= 2) {
      lastTimeTwoFaces = Date.now();
    }

    if (Date.now() - lastTimeTwoFaces < 3000) {
      document.querySelector('body').classList.add('petri-spectators');
    } else {
      document.querySelector('body').classList.remove('petri-spectators');
    }
  }
}

function draw_faces(ctx, rects, sc, max) {
  const on = rects.length;
  if(on && max) {
    jsfeat.math.qsort(rects, 0, on-1, function(a,b){return (b.confidence<a.confidence);})
  }
  let n = max || on;
  n = Math.min(n, on);
  let r;
  for(let i = 0; i < n; ++i) {
    r = rects[i];
    ctx.strokeRect((r.x*sc)|0,(r.y*sc)|0,(r.width*sc)|0,(r.height*sc)|0);
  }
  ctx.font = '16px sans-serif';
  ctx.fillText(n.toString(), 10, 10);
}

window.addEventListener('unload', function() {
  video.pause();
  video.src = null;
});
