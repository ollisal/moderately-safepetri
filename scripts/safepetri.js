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
let formerPetriScrollPos = null;

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

    const scrollerElem = document.getElementById('msgs_scroller_div');
    if (Date.now() - lastTimeTwoFaces < 3000) {
      if (inPetriChannel && formerPetriScrollPos === null && scrollerElem) {
        formerPetriScrollPos = scrollerElem.scrollTop;
      }

      document.querySelector('body').classList.add('petri-spectators');
    } else {
      document.querySelector('body').classList.remove('petri-spectators');

      if (inPetriChannel && formerPetriScrollPos !== null) {
        scrollerElem.scrollTop = formerPetriScrollPos;
        formerPetriScrollPos = null;
      }
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

// ethical content
const ethicalContentHtml = `
<div id="ethical_msgs_div" class="msgs_holder"><div class="day_container"><div class="day_divider" id="day_divider_1484721772_000002" data-date="January 18th, 2017" data-ts="1484721772.000002"><i class="copy_only"><br>----- </i><div class="day_divider_label" aria-label="January 18th">Wednesday, January 18th</div><i class="copy_only">  -----</i></div>
<div class="day_msgs" data-date="January 18th, 2017" data-ts="1484721772.000002">
<ts-message id="msg_1484721772_000002" data-ts="1484721772.000002" data-model-ob-id="C3T1S1RBP" data-member-id="U02S114DD" data-qa="message_container" class="message joined automated feature_fix_files first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S114DD" target="/team/U02S114DD" class=" member_preview_link member_image thumb_36" data-member-id="U02S114DD" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S114DD-e4f279983556-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1484721772000002" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>08:42<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Jan&nbsp;18th&nbsp;at&nbsp;08:42:52</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1484721772.000002" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S114DD" target="/team/U02S114DD" class="message_sender color_U02S114DD color_8469bc member member_preview_link " data-member-id="U02S114DD">esa</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S114DD color_8469bc hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1484721772000002" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>08:42<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Jan&nbsp;18th&nbsp;at&nbsp;08:42:52</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1484721772.000002" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">joined #etiikka along with <span class="ts_tip ts_tip_multiline ts_tip_lazy ts_tip_top ts_tip_float" title="tsarkki and kimmo.surakka">2 others</span>. Also, <button type="button" class="btn_unstyle internal_member_link member_preview_link" data-member-id="U02SDMGUR">pasi.kovanen</button> joined and left.<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1484721772_000002-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="false" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1484721772000002">
<button type="button" data-action="reaction" class="btn_unstyle btn_msg_action ts_icon ts_icon_small_reaction ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Add reaction …" aria-label="Add reaction …"></button><button type="button" data-action="share_message" data-permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1484721772000002" class="btn_unstyle btn_msg_action ts_icon ts_icon_share_action ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Share message …" aria-label="Share message …"></button><button type="button" data-action="actions_menu" class="btn_unstyle btn_msg_action ts_icon ts_icon_small_ellipsis ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Show message actions" aria-label="Show message actions"></button></div>

</ts-message>
 </div></div><div class="day_container"><div class="day_divider" id="day_divider_1486720841_000003" data-date="February 10th, 2017" data-ts="1486720841.000003"><i class="copy_only"><br>----- </i><div class="day_divider_label" aria-label="February 10th">Friday, February 10th</div><i class="copy_only">  -----</i></div>
<div class="day_msgs" data-date="February 10th, 2017" data-ts="1486720841.000003">
<ts-message id="msg_1486720841_000003" data-ts="1486720841.000003" data-model-ob-id="C3T1S1RBP" data-member-id="U0508SNN7" data-qa="message_container" class="message feature_fix_files first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U0508SNN7" target="/team/U0508SNN7" class=" member_preview_link member_image thumb_36" data-member-id="U0508SNN7" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U0508SNN7-f83244e80b8c-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1486720841000003" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:00<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;10th&nbsp;at&nbsp;12:00:41</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1486720841.000003" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U0508SNN7" target="/team/U0508SNN7" class="message_sender color_U0508SNN7 color_9e3997 member member_preview_link " data-member-id="U0508SNN7">kimmo.surakka</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U0508SNN7 color_9e3997 hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1486720841000003" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:00<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;10th&nbsp;at&nbsp;12:00:41</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1486720841.000003" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Oliko sulla <a href="/team/U02S114DD" target="/team/U02S114DD" data-member-id="U02S114DD" data-stringify-text="@U02S114DD" data-tip-member="U02S114DD" data-member-label="@esa" class="internal_member_link ts_tip ts_tip_top ts_tip_lazy ts_tip_float ts_tip_member">@esa</a> joku ajatus tälle kanavalle?<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1486720841_000003-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights narrow_buttons" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1486720841000003">
<button type="button" data-action="reaction" class="btn_unstyle btn_msg_action ts_icon ts_icon_small_reaction ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Add reaction …" aria-label="Add reaction …"></button><button type="button" data-action="reply" class="btn_unstyle btn_msg_action ts_icon ts_icon_comment_alt ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Start a thread" aria-label="Start a thread"></button><button type="button" data-action="share_message" data-permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1486720841000003" class="btn_unstyle btn_msg_action ts_icon ts_icon_share_action ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Share message …" aria-label="Share message …"></button><button type="button" data-action="actions_menu" class="btn_unstyle btn_msg_action ts_icon ts_icon_small_ellipsis ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Show message actions" aria-label="Show message actions"></button></div>

</ts-message>
 
<ts-message id="msg_1486724333_000004" data-ts="1486724333.000004" data-model-ob-id="C3T1S1RBP" data-member-id="U0B1KK4S1" data-qa="message_container" class="message joined automated feature_fix_files first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U0B1KK4S1" target="/team/U0B1KK4S1" class=" member_preview_link member_image thumb_36" data-member-id="U0B1KK4S1" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U0B1KK4S1-368a1eb0723d-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1486724333000004" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:58<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;10th&nbsp;at&nbsp;12:58:53</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1486724333.000004" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U0B1KK4S1" target="/team/U0B1KK4S1" class="message_sender color_U0B1KK4S1 color_7d414c member member_preview_link " data-member-id="U0B1KK4S1">vilan</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U0B1KK4S1 color_7d414c">
							<span class="emoji emoji-sizer stop_animations" style="background-image:url(https://slack-imgs.com/?c=1&amp;o1=gu&amp;url=https%3A%2F%2Femoji.slack-edge.com%2FT02S19HR0%2Fparrot%2F2b77ce57c3e5624f.gif)" title="parrot"></span>
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									<span class="emoji emoji-sizer" style="background-image:url(https://emoji.slack-edge.com/T02S19HR0/parrot/2b77ce57c3e5624f.gif)" title="parrot"></span>
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1486724333000004" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:58<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;10th&nbsp;at&nbsp;12:58:53</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1486724333.000004" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">joined #etiikka.<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1486724333_000004-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="false" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1486724333000004">
<button type="button" data-action="reaction" class="btn_unstyle btn_msg_action ts_icon ts_icon_small_reaction ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Add reaction …" aria-label="Add reaction …"></button><button type="button" data-action="share_message" data-permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1486724333000004" class="btn_unstyle btn_msg_action ts_icon ts_icon_share_action ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Share message …" aria-label="Share message …"></button><button type="button" data-action="actions_menu" class="btn_unstyle btn_msg_action ts_icon ts_icon_small_ellipsis ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Show message actions" aria-label="Show message actions"></button></div>

</ts-message>
 
<ts-message id="msg_1486724348_000005" data-ts="1486724348.000005" data-model-ob-id="C3T1S1RBP" data-member-id="U0B1KK4S1" data-qa="message_container" class="message feature_fix_files first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U0B1KK4S1" target="/team/U0B1KK4S1" class=" member_preview_link member_image thumb_36" data-member-id="U0B1KK4S1" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U0B1KK4S1-368a1eb0723d-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1486724348000005" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:59<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;10th&nbsp;at&nbsp;12:59:08</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1486724348.000005" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U0B1KK4S1" target="/team/U0B1KK4S1" class="message_sender color_U0B1KK4S1 color_7d414c member member_preview_link " data-member-id="U0B1KK4S1">vilan</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U0B1KK4S1 color_7d414c">
							<span class="emoji emoji-sizer stop_animations" style="background-image:url(https://slack-imgs.com/?c=1&amp;o1=gu&amp;url=https%3A%2F%2Femoji.slack-edge.com%2FT02S19HR0%2Fparrot%2F2b77ce57c3e5624f.gif)" title="parrot"></span>
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									<span class="emoji emoji-sizer" style="background-image:url(https://emoji.slack-edge.com/T02S19HR0/parrot/2b77ce57c3e5624f.gif)" title="parrot"></span>
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1486724348000005" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:59<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;10th&nbsp;at&nbsp;12:59:08</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1486724348.000005" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Katsoin eka että 'etikka'<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1486724348_000005-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights narrow_buttons" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1486724348000005">
<button type="button" data-action="reaction" class="btn_unstyle btn_msg_action ts_icon ts_icon_small_reaction ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Add reaction …" aria-label="Add reaction …"></button><button type="button" data-action="reply" class="btn_unstyle btn_msg_action ts_icon ts_icon_comment_alt ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Start a thread" aria-label="Start a thread"></button><button type="button" data-action="share_message" data-permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1486724348000005" class="btn_unstyle btn_msg_action ts_icon ts_icon_share_action ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Share message …" aria-label="Share message …"></button><button type="button" data-action="actions_menu" class="btn_unstyle btn_msg_action ts_icon ts_icon_small_ellipsis ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Show message actions" aria-label="Show message actions"></button></div>

</ts-message>
 </div></div><div class="day_container"><div class="day_divider" id="day_divider_1486985331_000002" data-date="February 13th, 2017" data-ts="1486985331.000002"><i class="copy_only"><br>----- </i><div class="day_divider_label" aria-label="February 13th">Monday, February 13th</div><i class="copy_only">  -----</i></div>
<div class="day_msgs" data-date="February 13th, 2017" data-ts="1486985331.000002">
<ts-message id="msg_1486985331_000002" data-ts="1486985331.000002" data-model-ob-id="C3T1S1RBP" data-member-id="U0508SNN7" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U0508SNN7" target="/team/U0508SNN7" class=" member_preview_link member_image thumb_36" data-member-id="U0508SNN7" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U0508SNN7-f83244e80b8c-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1486985331000002" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>13:28<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;13th&nbsp;at&nbsp;13:28:51</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1486985331.000002" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U0508SNN7" target="/team/U0508SNN7" class="message_sender color_U0508SNN7 color_9e3997 member member_preview_link " data-member-id="U0508SNN7">kimmo.surakka</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U0508SNN7 color_9e3997 hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1486985331000002" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>13:28<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;13th&nbsp;at&nbsp;13:28:51</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1486985331.000002" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">aika etikkaiselta tuntuu keskustelukin<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1486985331_000002-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1486985331000002">
		</div>

</ts-message>
 </div></div><div class="day_container"><div class="day_divider" id="day_divider_1487145770_000002" data-date="February 15th, 2017" data-ts="1487145770.000002"><i class="copy_only"><br>----- </i><div class="day_divider_label" aria-label="February 15th">Wednesday, February 15th</div><i class="copy_only">  -----</i></div>
<div class="day_msgs" data-date="February 15th, 2017" data-ts="1487145770.000002">
<ts-message id="msg_1487145770_000002" data-ts="1487145770.000002" data-model-ob-id="C3T1S1RBP" data-member-id="U02S114DD" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S114DD" target="/team/U02S114DD" class=" member_preview_link member_image thumb_36" data-member-id="U02S114DD" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S114DD-e4f279983556-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487145770000002" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:02<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;15th&nbsp;at&nbsp;10:02:50</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487145770.000002" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S114DD" target="/team/U02S114DD" class="message_sender color_U02S114DD color_8469bc member member_preview_link " data-member-id="U02S114DD">esa</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S114DD color_8469bc hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487145770000002" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:02<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;15th&nbsp;at&nbsp;10:02:50</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487145770.000002" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body"><a href="/team/U0508SNN7" target="/team/U0508SNN7" data-member-id="U0508SNN7" data-stringify-text="@U0508SNN7" data-tip-member="U0508SNN7" data-member-label="@kimmo.surakka" class="internal_member_link ts_tip ts_tip_top ts_tip_lazy ts_tip_float ts_tip_member">@kimmo.surakka</a>: voidaan luoda tarkoitus yhdessä. tää lähti siitä että kun kyselee tekijöitä vaikkapa veikkaukselle niin joku aina aloittaa keskustelun siitä onko asiakas hyvis vai pahis. nii täällä vois keskustella ja vääntää siitä. tai ihan mistä vaan<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487145770_000002-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487145770000002">
		</div>

</ts-message>
 </div></div><div class="day_container"><div class="day_divider" id="day_divider_1487758524_000002" data-date="February 22nd, 2017" data-ts="1487758524.000002"><i class="copy_only"><br>----- </i><div class="day_divider_label" aria-label="February 22nd">Wednesday, February 22nd</div><i class="copy_only">  -----</i></div>
<div class="day_msgs" data-date="February 22nd, 2017" data-ts="1487758524.000002">
<ts-message id="msg_1487758524_000002" data-ts="1487758524.000002" data-model-ob-id="C3T1S1RBP" data-member-id="U02S16NCV" data-qa="message_container" class="message joined automated feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S16NCV" target="/team/U02S16NCV" class=" member_preview_link member_image thumb_36" data-member-id="U02S16NCV" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S16NCV-83b12b65eecf-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487758524000002" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:15<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;22nd&nbsp;at&nbsp;12:15:24</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487758524.000002" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S16NCV" target="/team/U02S16NCV" class="message_sender color_U02S16NCV color_e7392d member member_preview_link " data-member-id="U02S16NCV">antti.loponen</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S16NCV color_e7392d hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487758524000002" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:15<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;22nd&nbsp;at&nbsp;12:15:24</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487758524.000002" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">joined #etiikka.<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487758524_000002-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="false" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487758524000002">
		</div>

</ts-message>
 
<ts-message id="msg_1487759160_000003" data-ts="1487759160.000003" data-model-ob-id="C3T1S1RBP" data-member-id="U02S16NCV" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S16NCV" target="/team/U02S16NCV" class=" member_preview_link member_image thumb_36" data-member-id="U02S16NCV" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S16NCV-83b12b65eecf-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487759160000003" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:26<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;22nd&nbsp;at&nbsp;12:26:00</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487759160.000003" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S16NCV" target="/team/U02S16NCV" class="message_sender color_U02S16NCV color_e7392d member member_preview_link " data-member-id="U02S16NCV">antti.loponen</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S16NCV color_e7392d hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487759160000003" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:26<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;22nd&nbsp;at&nbsp;12:26:00</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487759160.000003" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">hyvä keskustelunavaus. olisko periaatteessa mahdollisuus kieltäytyä projektista eettisistä syistä? mun olis vaikea löytää motivaatiota vaikka kehittää softaa tehostamaan häkkikanalan toimintaa<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487759160_000003-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487759160000003">
		</div>

</ts-message>
 
<ts-message id="msg_1487760468_000004" data-ts="1487760468.000004" data-model-ob-id="C3T1S1RBP" data-member-id="U02S114DD" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S114DD" target="/team/U02S114DD" class=" member_preview_link member_image thumb_36" data-member-id="U02S114DD" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S114DD-e4f279983556-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487760468000004" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:47<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;22nd&nbsp;at&nbsp;12:47:48</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487760468.000004" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S114DD" target="/team/U02S114DD" class="message_sender color_U02S114DD color_8469bc member member_preview_link " data-member-id="U02S114DD">esa</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S114DD color_8469bc hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487760468000004" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:47<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;22nd&nbsp;at&nbsp;12:47:48</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487760468.000004" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Onhan se käytännössä<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487760468_000004-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487760468000004">
		</div>

</ts-message>
 
<ts-message id="msg_1487760491_000005" data-ts="1487760491.000005" data-model-ob-id="C3T1S1RBP" data-member-id="U02S114DD" data-qa="message_container" class="message feature_fix_files dirty_hover_container" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S114DD" target="/team/U02S114DD" class=" member_preview_link member_image thumb_36" data-member-id="U02S114DD" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S114DD-e4f279983556-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487760491000005" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i><span class="light_only">12:48</span><span class="dense_only">12:48</span><i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;22nd&nbsp;at&nbsp;12:48:11</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487760491.000005" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S114DD" target="/team/U02S114DD" class="message_sender color_U02S114DD color_8469bc member member_preview_link " data-member-id="U02S114DD">esa</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S114DD color_8469bc hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487760491000005" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:48<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;22nd&nbsp;at&nbsp;12:48:11</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487760491.000005" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Ainakin mulle sitä on tullut vastaan useammin kuin kerran ja se on mun mielestä täysin oikeutettua<span class="edited ts_tip ts_tip_top ts_tip_float ts_tip_delay_300" title="Feb 22nd at 12:48"> (edited)</span><span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487760491_000005-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487760491000005">
		</div>

</ts-message>
 </div></div><div class="day_container"><div class="day_divider" id="day_divider_1487838347_000007" data-date="February 23rd, 2017" data-ts="1487838347.000007"><i class="copy_only"><br>----- </i><div class="day_divider_label" aria-label="February 23rd">Thursday, February 23rd</div><i class="copy_only">  -----</i></div>
<div class="day_msgs" data-date="February 23rd, 2017" data-ts="1487838347.000007">
<ts-message id="msg_1487838347_000007" data-ts="1487838347.000007" data-model-ob-id="C3T1S1RBP" data-member-id="U02S19N2X" data-qa="message_container" class="message joined automated feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S19N2X" target="/team/U02S19N2X" class=" member_preview_link member_image thumb_36" data-member-id="U02S19N2X" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S19N2X-5cb1bcb68dda-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487838347000007" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:25<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:25:47</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487838347.000007" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S19N2X" target="/team/U02S19N2X" class="message_sender color_U02S19N2X color_5b89d5 member member_preview_link " data-member-id="U02S19N2X">mikko.auvinen</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S19N2X color_5b89d5 hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487838347000007" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:25<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:25:47</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487838347.000007" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">joined #etiikka.<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487838347_000007-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="false" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487838347000007">
		</div>

</ts-message>
 
<ts-message id="msg_1487838385_000008" data-ts="1487838385.000008" data-model-ob-id="C3T1S1RBP" data-member-id="U02S19N2X" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S19N2X" target="/team/U02S19N2X" class=" member_preview_link member_image thumb_36" data-member-id="U02S19N2X" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S19N2X-5cb1bcb68dda-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487838385000008" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:26<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:26:25</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487838385.000008" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S19N2X" target="/team/U02S19N2X" class="message_sender color_U02S19N2X color_5b89d5 member member_preview_link " data-member-id="U02S19N2X">mikko.auvinen</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S19N2X color_5b89d5 hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487838385000008" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:26<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:26:25</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487838385.000008" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Eiks se oo tässä firmassa ihan ok että koitetaan mätsätä projektit ja työntekijät eikä pakoteta ketää tekemään mitään mitä ei halua<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487838385_000008-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487838385000008">
		</div>

</ts-message>
 
<ts-message id="msg_1487838419_000009" data-ts="1487838419.000009" data-model-ob-id="C3T1S1RBP" data-member-id="U02S023HT" data-qa="message_container" class="message joined automated feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S023HT" target="/team/U02S023HT" class=" member_preview_link member_image thumb_36" data-member-id="U02S023HT" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S023HT-9362f1909a97-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487838419000009" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:26<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:26:59</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487838419.000009" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S023HT" target="/team/U02S023HT" class="message_sender color_U02S023HT color_53b759 member member_preview_link " data-member-id="U02S023HT">arime</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S023HT color_53b759">
							<span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:27.5% 57.5%;background-size:4100%" title="house_with_garden"></span>
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									<span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:27.5% 57.5%;background-size:4100%" title="house_with_garden"></span><span class="prevent_copy_paste" aria-label=" "></span><span class="prevent_copy_paste" aria-label="Working remotely"></span>
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487838419000009" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:26<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:26:59</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487838419.000009" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">joined #etiikka.<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487838419_000009-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="false" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487838419000009">
		</div>

</ts-message>
 
<ts-message id="msg_1487838428_000010" data-ts="1487838428.000010" data-model-ob-id="C3T1S1RBP" data-member-id="U02S19N2X" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S19N2X" target="/team/U02S19N2X" class=" member_preview_link member_image thumb_36" data-member-id="U02S19N2X" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S19N2X-5cb1bcb68dda-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487838428000010" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:27<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:27:08</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487838428.000010" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S19N2X" target="/team/U02S19N2X" class="message_sender color_U02S19N2X color_5b89d5 member member_preview_link " data-member-id="U02S19N2X">mikko.auvinen</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S19N2X color_5b89d5 hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487838428000010" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:27<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:27:08</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487838428.000010" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Joskus on "soft-pakko" tehdä einiinkivaa hommaa jos muuta ei ole mutta kai toi eettinen fiilis kannattaa niissä tilanteissa nostaa esille jos sellaisia olis.<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487838428_000010-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487838428000010">
		</div>

</ts-message>
 
<ts-message id="msg_1487838436_000011" data-ts="1487838436.000011" data-model-ob-id="C3T1S1RBP" data-member-id="U02S023HT" data-qa="message_container" class="message feature_fix_files first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S023HT" target="/team/U02S023HT" class=" member_preview_link member_image thumb_36" data-member-id="U02S023HT" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S023HT-9362f1909a97-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487838436000011" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:27<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:27:16</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487838436.000011" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S023HT" target="/team/U02S023HT" class="message_sender color_U02S023HT color_53b759 member member_preview_link " data-member-id="U02S023HT">arime</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S023HT color_53b759">
							<span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:27.5% 57.5%;background-size:4100%" title="house_with_garden"></span>
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									<span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:27.5% 57.5%;background-size:4100%" title="house_with_garden"></span><span class="prevent_copy_paste" aria-label=" "></span><span class="prevent_copy_paste" aria-label="Working remotely"></span>
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487838436000011" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:27<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:27:16</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487838436.000011" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Niin. Varmasti löytyy niitäkin tämän kokoisesta firmasta, jota mm. tappaminen kiinnostaa. <span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:65% 72.5%;background-size:4100%" title="wink">:wink:</span><span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487838436_000011-C3T1S1RBP " data-rxn-key="message-1487838436.000011-C3T1S1RBP"><button type="button" data-emoji="trollface" class="btn_unstyle rxn ts_tip ts_tip_top ts_tip_float ts_tip_multiline ts_tip_delay_300 " title="">
	<span class="emoji emoji-sizer" style="background-image:url(https://emoji.slack-edge.com/T02S19HR0/trollface/8c0ac4ae98.png)"></span><span class="emoji_rxn_count" aria-label="1"></span>
</button><span class="rxn_hover_container">
		<button type="button" class="btn_unstyle rxn menu_rxn ts_tip ts_tip_top ts_tip_float ts_tip_multiline ts_tip_delay_300" title="Add reaction...">
			<span class="emoji-outer emoji-sizer">
			<i class="ts_icon ts_icon_circle_fill"></i><i class="ts_icon ts_icon_add_reaction"></i>
			</span>
		</button></span></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights narrow_buttons" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487838436000011">
<button type="button" data-action="reaction" class="btn_unstyle btn_msg_action ts_icon ts_icon_small_reaction ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Add reaction …" aria-label="Add reaction …"></button><button type="button" data-action="reply" class="btn_unstyle btn_msg_action ts_icon ts_icon_comment_alt ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Start a thread" aria-label="Start a thread"></button><button type="button" data-action="share_message" data-permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487838436000011" class="btn_unstyle btn_msg_action ts_icon ts_icon_share_action ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Share message …" aria-label="Share message …"></button><button type="button" data-action="actions_menu" class="btn_unstyle btn_msg_action ts_icon ts_icon_small_ellipsis ts_tip ts_tip_top ts_tip_float ts_tip_delay_60" title="Show message actions" aria-label="Show message actions"></button></div>

</ts-message>
 
<ts-message id="msg_1487838504_000013" data-ts="1487838504.000013" data-model-ob-id="C3T1S1RBP" data-member-id="U1CSAKXB2" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U1CSAKXB2" target="/team/U1CSAKXB2" class=" member_preview_link member_image thumb_36" data-member-id="U1CSAKXB2" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U1CSAKXB2-ceb5239173e0-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487838504000013" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:28<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:28:24</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487838504.000013" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U1CSAKXB2" target="/team/U1CSAKXB2" class="message_sender color_U1CSAKXB2 color_e85d72 member member_preview_link " data-member-id="U1CSAKXB2">tsarkki</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U1CSAKXB2 color_e85d72">
							<span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:5% 60%;background-size:4100%" title="pick"></span>
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									<span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:5% 60%;background-size:4100%" title="pick"></span>
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487838504000013" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:28<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:28:24</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487838504.000013" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Joo, siis ainakin mulle on ok jos joku kieltäytyy eettisistä syistä projektista. Itsekään en ottais tiettyjä organisaatioita asiakkaiks eettisistä syistä<span class="edited ts_tip ts_tip_top ts_tip_float ts_tip_delay_300" title="Feb 23rd at 10:28"> (edited)</span><span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487838504_000013-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487838504000013">
		</div>

</ts-message>
 
<ts-message id="msg_1487838512_000014" data-ts="1487838512.000014" data-model-ob-id="C3T1S1RBP" data-member-id="U02S19N2X" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S19N2X" target="/team/U02S19N2X" class=" member_preview_link member_image thumb_36" data-member-id="U02S19N2X" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S19N2X-5cb1bcb68dda-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487838512000014" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:28<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:28:32</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487838512.000014" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S19N2X" target="/team/U02S19N2X" class="message_sender color_U02S19N2X color_5b89d5 member member_preview_link " data-member-id="U02S19N2X">mikko.auvinen</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S19N2X color_5b89d5 hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487838512000014" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:28<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:28:32</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487838512.000014" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">noi on vaikeita juttuja, esim. toi kanalahomman tehostaminen vois olla että lisätään joku tainnutuspönttövaihe linjan alkuun mikä tekee hommasta humaanimpaa.<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487838512_000014-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487838512000014">
		</div>

</ts-message>
 
<ts-message id="msg_1487838515_000015" data-ts="1487838515.000015" data-model-ob-id="C3T1S1RBP" data-member-id="U02S16NCV" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S16NCV" target="/team/U02S16NCV" class=" member_preview_link member_image thumb_36" data-member-id="U02S16NCV" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S16NCV-83b12b65eecf-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487838515000015" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:28<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:28:35</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487838515.000015" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S16NCV" target="/team/U02S16NCV" class="message_sender color_U02S16NCV color_e7392d member member_preview_link " data-member-id="U02S16NCV">antti.loponen</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S16NCV color_e7392d hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487838515000015" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:28<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:28:35</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487838515.000015" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">ja varmaan motivoi tekemään parempaa jälkeä jos projekti on omiin näkemyksiin sopiva<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487838515_000015-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487838515000015">
		</div>

</ts-message>
 
<ts-message id="msg_1487838614_000017" data-ts="1487838614.000017" data-model-ob-id="C3T1S1RBP" data-member-id="U02S00KQ5" data-qa="message_container" class="message joined automated feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S00KQ5" target="/team/U02S00KQ5" class=" member_preview_link member_image thumb_36" data-member-id="U02S00KQ5" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S00KQ5-f784bdddc05d-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487838614000017" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:30<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:30:14</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487838614.000017" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S00KQ5" target="/team/U02S00KQ5" class="message_sender color_U02S00KQ5 color_e7392d member member_preview_link " data-member-id="U02S00KQ5">iikku</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S00KQ5 color_e7392d">
							<span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:5% 37.5%;background-size:4100%" title="black_circle"></span>
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									<span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:5% 37.5%;background-size:4100%" title="black_circle"></span>
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487838614000017" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:30<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:30:14</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487838614.000017" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">joined #etiikka along with <button type="button" class="btn_unstyle internal_member_link member_preview_link" data-member-id="U02S081CD">veli-pekka.eloranta</button>.<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487838614_000017-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="false" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487838614000017">
		</div>

</ts-message>
 
<ts-message id="msg_1487838682_000019" data-ts="1487838682.000019" data-model-ob-id="C3T1S1RBP" data-member-id="U02S19N2X" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S19N2X" target="/team/U02S19N2X" class=" member_preview_link member_image thumb_36" data-member-id="U02S19N2X" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S19N2X-5cb1bcb68dda-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487838682000019" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:31<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:31:22</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487838682.000019" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S19N2X" target="/team/U02S19N2X" class="message_sender color_U02S19N2X color_5b89d5 member member_preview_link " data-member-id="U02S19N2X">mikko.auvinen</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S19N2X color_5b89d5 hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487838682000019" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:31<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:31:22</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487838682.000019" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">itekin teen 3D-videostriimausta minkä tuloksia käytetään todennäköisesti tulevaisuudessa välillisesti pornon striimaukseen <span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:65% 72.5%;background-size:4100%" title="wink">:wink:</span><span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487838682_000019-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487838682000019">
		</div>

</ts-message>
 
<ts-message id="msg_1487838706_000020" data-ts="1487838706.000020" data-model-ob-id="C3T1S1RBP" data-member-id="U02S16NCV" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S16NCV" target="/team/U02S16NCV" class=" member_preview_link member_image thumb_36" data-member-id="U02S16NCV" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S16NCV-83b12b65eecf-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487838706000020" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:31<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:31:46</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487838706.000020" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S16NCV" target="/team/U02S16NCV" class="message_sender color_U02S16NCV color_e7392d member member_preview_link " data-member-id="U02S16NCV">antti.loponen</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S16NCV color_e7392d hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487838706000020" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:31<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:31:46</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487838706.000020" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">niin siis tämä viittasi mun edelliseen kommenttiin? <span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:65% 72.5%;background-size:4100%" title="wink">:wink:</span><span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487838706_000020-C3T1S1RBP " data-rxn-key="message-1487838706.000020-C3T1S1RBP"><button type="button" data-emoji="heybaby" class="btn_unstyle rxn ts_tip ts_tip_top ts_tip_float ts_tip_multiline ts_tip_delay_300 " title="">
	<span class="emoji emoji-sizer" style="background-image:url(https://emoji.slack-edge.com/T02S19HR0/winky/a67f650f2957b59f.gif)"></span><span class="emoji_rxn_count" aria-label="1"></span>
</button><span class="rxn_hover_container">
		<button type="button" class="btn_unstyle rxn menu_rxn ts_tip ts_tip_top ts_tip_float ts_tip_multiline ts_tip_delay_300" title="Add reaction...">
			<span class="emoji-outer emoji-sizer">
			<i class="ts_icon ts_icon_circle_fill"></i><i class="ts_icon ts_icon_add_reaction"></i>
			</span>
		</button></span></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487838706000020">
		</div>

</ts-message>
 
<ts-message id="msg_1487838807_000022" data-ts="1487838807.000022" data-model-ob-id="C3T1S1RBP" data-member-id="U02S00KQ5" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S00KQ5" target="/team/U02S00KQ5" class=" member_preview_link member_image thumb_36" data-member-id="U02S00KQ5" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S00KQ5-f784bdddc05d-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487838807000022" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:33<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:33:27</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487838807.000022" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S00KQ5" target="/team/U02S00KQ5" class="message_sender color_U02S00KQ5 color_e7392d member member_preview_link " data-member-id="U02S00KQ5">iikku</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S00KQ5 color_e7392d">
							<span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:5% 37.5%;background-size:4100%" title="black_circle"></span>
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									<span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:5% 37.5%;background-size:4100%" title="black_circle"></span>
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487838807000022" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:33<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:33:27</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487838807.000022" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">vaikka näitä on moni ennenkin pohtinut, niin yllättävän harva on lukenut <a href="https://www.acm.org/about-acm/acm-code-of-ethics-and-professional-conduct" rel="noreferrer" target="_blank">https://www.acm.org/about-acm/acm-code-of-ethics-and-professional-conduct</a>

	
	<div class="attachment_group has_border has_link">
		

<div class="inline_attachment standalone has_thumb" data-attachment-id="1" data-real-src="https://www.acm.org/about-acm/acm-code-of-ethics-and-professional-conduct">


		<div class="msg_inline_attachment_column column_border">
		</div>

	

	<div class="msg_inline_attachment_column column_content">


			<div class="msg_inline_attachment_row attachment_flush_text attachment_source">

					<span class="attachment_source_icon"><img class="attachment_source_icon" src="https://slack-imgs.com/?c=1&amp;o1=wi16.he16.si&amp;url=https%3A%2F%2Fwww.acm.org%2Fimages%2Ffavicon.ico%3Fv%3D10" alt=""></span>

					<span class="attachment_source_name">acm.org</span>



				
			</div>

			<div class="msg_inline_attachment_row attachment_flush_text">
					<div class="attachment_title">
							<a href="https://www.acm.org/about-acm/acm-code-of-ethics-and-professional-conduct" rel="noreferrer" target="_blank">
						ACM Code of Ethics and Professional Conduct</a>
						
					</div>

						This page describes the ACM code of ethics and professional conduct.
					
			</div>






	</div>

	
		<div class="msg_inline_attachment_column column_thumb">
			<div class="msg_inline_attachment_row">
				<a href="https://www.acm.org/about-acm/acm-code-of-ethics-and-professional-conduct" rel="noreferrer" target="_blank">
				<div class="msg_inline_attachment_thumb_holder" style="background-image: url(https://slack-imgs.com/?c=1&amp;o1=wi75.he75.si&amp;url=http%3A%2F%2Fwww.acm.org%2Fimages%2Facm_rgb_grad_pos_diamond.png);">
					<img class="msg_inline_attachment_thumb" src="https://slack-imgs.com/?c=1&amp;o1=wi75.he75.si&amp;url=http%3A%2F%2Fwww.acm.org%2Fimages%2Facm_rgb_grad_pos_diamond.png" alt="">
				</div>
				</a>
			</div>
		</div>
	


	

</div>

 
	</div>
	
<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487838807_000022-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487838807000022">
		</div>

</ts-message>
 
<ts-message id="msg_1487838818_000024" data-ts="1487838818.000024" data-model-ob-id="C3T1S1RBP" data-member-id="U02S16NCV" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S16NCV" target="/team/U02S16NCV" class=" member_preview_link member_image thumb_36" data-member-id="U02S16NCV" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S16NCV-83b12b65eecf-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487838818000024" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:33<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:33:38</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487838818.000024" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S16NCV" target="/team/U02S16NCV" class="message_sender color_U02S16NCV color_e7392d member member_preview_link " data-member-id="U02S16NCV">antti.loponen</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S16NCV color_e7392d hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487838818000024" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:33<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:33:38</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487838818.000024" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">on tää nykynen pharmaca fennica -projektikin vähän <span class="emoji emoji-sizer" style="background-image:url(https://emoji.slack-edge.com/T02S19HR0/notsure/c495a259c9adff60.jpg)" title="notsure">:notsure:</span> että onko tää sellanen joka auttaa lääkäreitä määräämään potilaille lääkkeet paremmin tai potilaille löytämään itsehoitolääkkeet paremmin; vai onko tää vaan millä isot pahat lääkefirmat käärii enemmän fyffeä<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487838818_000024-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487838818000024">
		</div>

</ts-message>
 
<ts-message id="msg_1487839672_000025" data-ts="1487839672.000025" data-model-ob-id="C3T1S1RBP" data-member-id="U02S114DD" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S114DD" target="/team/U02S114DD" class=" member_preview_link member_image thumb_36" data-member-id="U02S114DD" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S114DD-e4f279983556-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487839672000025" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:47<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:47:52</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487839672.000025" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S114DD" target="/team/U02S114DD" class="message_sender color_U02S114DD color_8469bc member member_preview_link " data-member-id="U02S114DD">esa</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S114DD color_8469bc hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487839672000025" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:47<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:47:52</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487839672.000025" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Firman komein moppiilisovellusreferenssi on <span class="emoji emoji-sizer" style="background-image:url(https://emoji.slack-edge.com/T02S19HR0/hese/0873b26ad88753c4.png)" title="hese">:hese:</span> , mutta en itse pystyis olemaan <span class="emoji emoji-sizer" style="background-image:url(https://emoji.slack-edge.com/T02S19HR0/hese/0873b26ad88753c4.png)" title="hese">:hese:</span> &nbsp;:n ylpeä kaupparatsu. Suurimmalle osalle ihmisistä tossa ei varmaan ole mitään ongelmaa, minkä toki ymmärrän. Oon itse asiassa joskus lukenut ton <span class="emoji emoji-sizer" style="background-image:url(https://emoji.slack-edge.com/T02S19HR0/hese/0873b26ad88753c4.png)" title="hese">:hese:</span> -kirjan <a href="http://www.antikvaari.fi/naytatuote.asp?id=1572248" rel="noreferrer" target="_blank">http://www.antikvaari.fi/naytatuote.asp?id=1572248</a> missä <span class="emoji emoji-sizer" style="background-image:url(https://emoji.slack-edge.com/T02S19HR0/hese/0873b26ad88753c4.png)" title="hese">:hese:</span> -pariskunnan Kirsti Salmelakin viittaa teurastamotoimintaan hankalana ja vastenmielisenä. Problem solved sillä että ulkoistetaan homma ja vastaanotetaan siistejä pakaste-pahvilaatikkoja. Toinen ongelma liittyy siihen että toikin sovellus osaltaan palvelee ei-kovin-terveellisen mielikuvitushöttöruuan markkinan kasvattamista. Toisaalta jos Hese ei valtaisi markkinaa niin luultavasti McD tai Burger King tekisi sen...<span class="para_break"><i class="copy_only"><br></i></span>Mutta sitten taas esim. joidenkin rahoitusalan kännysovellusten teettämisessä en näe juurikaan ongelmaa etenkään nykyisin kun korkotasot eivät enää ole villiä länttä. Joku toinen näkee isojakin ongelmia<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487839672_000025-C3T1S1RBP " data-rxn-key="message-1487839672.000025-C3T1S1RBP"><button type="button" data-emoji="+1" class="btn_unstyle rxn ts_tip ts_tip_top ts_tip_float ts_tip_multiline ts_tip_delay_300 " title="">
	<span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:37.5% 22.5%;background-size:4100%"></span><span class="emoji_rxn_count" aria-label="1"></span>
</button><span class="rxn_hover_container">
		<button type="button" class="btn_unstyle rxn menu_rxn ts_tip ts_tip_top ts_tip_float ts_tip_multiline ts_tip_delay_300" title="Add reaction...">
			<span class="emoji-outer emoji-sizer">
			<i class="ts_icon ts_icon_circle_fill"></i><i class="ts_icon ts_icon_add_reaction"></i>
			</span>
		</button></span></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487839672000025">
		</div>

</ts-message>
 
<ts-message id="msg_1487839681_000026" data-ts="1487839681.000026" data-model-ob-id="C3T1S1RBP" data-member-id="U0HL6LY82" data-qa="message_container" class="message joined automated feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U0HL6LY82" target="/team/U0HL6LY82" class=" member_preview_link member_image thumb_36" data-member-id="U0HL6LY82" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U0HL6LY82-ce57b0ff3a33-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487839681000026" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:48<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:48:01</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487839681.000026" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U0HL6LY82" target="/team/U0HL6LY82" class="message_sender color_U0HL6LY82 color_50a0cf member member_preview_link " data-member-id="U0HL6LY82">juho.saarela</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U0HL6LY82 color_50a0cf hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487839681000026" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>10:48<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;10:48:01</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487839681.000026" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">joined #etiikka along with <button type="button" class="btn_unstyle internal_member_link member_preview_link" data-member-id="U04867YCT">tommi.urtti</button>.<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487839681_000026-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="false" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487839681000026">
		</div>

</ts-message>
 
<ts-message id="msg_1487840520_000028" data-ts="1487840520.000028" data-model-ob-id="C3T1S1RBP" data-member-id="U02S114DD" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S114DD" target="/team/U02S114DD" class=" member_preview_link member_image thumb_36" data-member-id="U02S114DD" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S114DD-e4f279983556-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487840520000028" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>11:02<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:02:00</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487840520.000028" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S114DD" target="/team/U02S114DD" class="message_sender color_U02S114DD color_8469bc member member_preview_link " data-member-id="U02S114DD">esa</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S114DD color_8469bc hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487840520000028" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>11:02<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:02:00</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487840520.000028" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Veikkauksen nettipeleissä en näe juuri ongelmaa siksi, että Veikkauksen omistaa Suomen valtio ja ne voittorahat pääosin käytetään hyvää tarkoittaviin asioihin Suomessa. Mikäli Veikkauksen palvelut eivät ole laadukkaita ja kilpailukykyisiä, se miljardi euroa minkä suomalaiset nyt pelaavat netissä Veikkausta vuosittain menee jatkossa Maltalle ja muuhun netin villiin länteen ulkomaille missä pyörii yksityisomisteisia nettipelikasinoita<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487840520_000028-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487840520000028">
		</div>

</ts-message>
 
<ts-message id="msg_1487840764_000029" data-ts="1487840764.000029" data-model-ob-id="C3T1S1RBP" data-member-id="U02S114DD" data-qa="message_container" class="message feature_fix_files dirty_hover_container" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S114DD" target="/team/U02S114DD" class=" member_preview_link member_image thumb_36" data-member-id="U02S114DD" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S114DD-e4f279983556-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487840764000029" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i><span class="light_only">11:06</span><span class="dense_only">11:06</span><i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:06:04</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487840764.000029" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S114DD" target="/team/U02S114DD" class="message_sender color_U02S114DD color_8469bc member member_preview_link " data-member-id="U02S114DD">esa</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S114DD color_8469bc hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487840764000029" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>11:06<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:06:04</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487840764.000029" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Se on sitten hyvä ja eri kysymys että pärjäisivätkö ihmiset ilman em. palveluita (todennäköisesti kyllä) ja miksi omaa rajallista määrää rahaa käytetään epärationaalisesti kaikkeen höttöön<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487840764_000029-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487840764000029">
		</div>

</ts-message>
 
<ts-message id="msg_1487840854_000030" data-ts="1487840854.000030" data-model-ob-id="C3T1S1RBP" data-member-id="U02S114DD" data-qa="message_container" class="message feature_fix_files dirty_hover_container" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S114DD" target="/team/U02S114DD" class=" member_preview_link member_image thumb_36" data-member-id="U02S114DD" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S114DD-e4f279983556-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487840854000030" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i><span class="light_only">11:07</span><span class="dense_only">11:07</span><i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:07:34</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487840854.000030" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S114DD" target="/team/U02S114DD" class="message_sender color_U02S114DD color_8469bc member member_preview_link " data-member-id="U02S114DD">esa</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S114DD color_8469bc hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487840854000030" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>11:07<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:07:34</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487840854.000030" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">(Minäkin käytän <span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:70% 15%;background-size:4100%" title="face_with_rolling_eyes">:face_with_rolling_eyes:</span>)<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487840854_000030-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487840854000030">
		</div>

</ts-message>
 
<ts-message id="msg_1487841890_000034" data-ts="1487841890.000034" data-model-ob-id="C3T1S1RBP" data-member-id="U02S114DD" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S114DD" target="/team/U02S114DD" class=" member_preview_link member_image thumb_36" data-member-id="U02S114DD" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S114DD-e4f279983556-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487841890000034" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>11:24<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:24:50</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487841890.000034" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S114DD" target="/team/U02S114DD" class="message_sender color_U02S114DD color_8469bc member member_preview_link " data-member-id="U02S114DD">esa</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S114DD color_8469bc hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487841890000034" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>11:24<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:24:50</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487841890.000034" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Jaa nyt huomasin tuon "sivarina tappokonekoodausta" -keskustelun... enpä kyllä (tälleen sivarina, jos se nyt on joku määrittävä tekijä) vois sellaistakaan kaupata. Mutta näihin on monia näkökulmia<span class="edited ts_tip ts_tip_top ts_tip_float ts_tip_delay_300" title="Feb 23rd at 11:25"> (edited)</span><span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487841890_000034-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487841890000034">
		</div>

</ts-message>
 
<ts-message id="msg_1487843075_000036" data-ts="1487843075.000036" data-model-ob-id="C3T1S1RBP" data-member-id="U02S19N2X" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S19N2X" target="/team/U02S19N2X" class=" member_preview_link member_image thumb_36" data-member-id="U02S19N2X" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S19N2X-5cb1bcb68dda-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487843075000036" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>11:44<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:44:35</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487843075.000036" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S19N2X" target="/team/U02S19N2X" class="message_sender color_U02S19N2X color_5b89d5 member member_preview_link " data-member-id="U02S19N2X">mikko.auvinen</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S19N2X color_5b89d5 hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487843075000036" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>11:44<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:44:35</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487843075.000036" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Aika vähän on niitä projekteja minkä tuotosta ei mitenkään ajateltuna vois käyttää johonkin epäeettiseen<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487843075_000036-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487843075000036">
		</div>

</ts-message>
 
<ts-message id="msg_1487843090_000037" data-ts="1487843090.000037" data-model-ob-id="C3T1S1RBP" data-member-id="U02S19N2X" data-qa="message_container" class="message feature_fix_files dirty_hover_container" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S19N2X" target="/team/U02S19N2X" class=" member_preview_link member_image thumb_36" data-member-id="U02S19N2X" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S19N2X-5cb1bcb68dda-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487843090000037" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i><span class="light_only">11:44</span><span class="dense_only">11:44</span><i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:44:50</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487843090.000037" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S19N2X" target="/team/U02S19N2X" class="message_sender color_U02S19N2X color_5b89d5 member member_preview_link " data-member-id="U02S19N2X">mikko.auvinen</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S19N2X color_5b89d5 hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487843090000037" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>11:44<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:44:50</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487843090.000037" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">IMT ainakin diilaa pedofiileille matkoja, se nyt on ihan varma!<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487843090_000037-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487843090000037">
		</div>

</ts-message>
 
<ts-message id="msg_1487843156_000038" data-ts="1487843156.000038" data-model-ob-id="C3T1S1RBP" data-member-id="U02S19N2X" data-qa="message_container" class="message feature_fix_files dirty_hover_container" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S19N2X" target="/team/U02S19N2X" class=" member_preview_link member_image thumb_36" data-member-id="U02S19N2X" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S19N2X-5cb1bcb68dda-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487843156000038" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i><span class="light_only">11:45</span><span class="dense_only">11:45</span><i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:45:56</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487843156.000038" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S19N2X" target="/team/U02S19N2X" class="message_sender color_U02S19N2X color_5b89d5 member member_preview_link " data-member-id="U02S19N2X">mikko.auvinen</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S19N2X color_5b89d5 hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487843156000038" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>11:45<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:45:56</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487843156.000038" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Taajuusmuuttajilla tehdään ydinpommeja, porauslaitteilla porataan Quantanamoon vankiluolia, Fazerin karkit ajaa ylilihavat itsemurhiin jne<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487843156_000038-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487843156000038">
		</div>

</ts-message>
 
<ts-message id="msg_1487843778_000039" data-ts="1487843778.000039" data-model-ob-id="C3T1S1RBP" data-member-id="U0B1KK4S1" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U0B1KK4S1" target="/team/U0B1KK4S1" class=" member_preview_link member_image thumb_36" data-member-id="U0B1KK4S1" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U0B1KK4S1-368a1eb0723d-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487843778000039" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>11:56<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:56:18</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487843778.000039" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U0B1KK4S1" target="/team/U0B1KK4S1" class="message_sender color_U0B1KK4S1 color_7d414c member member_preview_link " data-member-id="U0B1KK4S1">vilan</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U0B1KK4S1 color_7d414c">
							<span class="emoji emoji-sizer stop_animations" style="background-image:url(https://slack-imgs.com/?c=1&amp;o1=gu&amp;url=https%3A%2F%2Femoji.slack-edge.com%2FT02S19HR0%2Fparrot%2F2b77ce57c3e5624f.gif)" title="parrot"></span>
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									<span class="emoji emoji-sizer" style="background-image:url(https://emoji.slack-edge.com/T02S19HR0/parrot/2b77ce57c3e5624f.gif)" title="parrot"></span>
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487843778000039" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>11:56<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:56:18</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487843778.000039" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Mites nää pikavipit? <span class="emoji emoji-sizer" style="background-image:url(https://emoji.slack-edge.com/T02S19HR0/trollface/8c0ac4ae98.png)" title="troll">:troll:</span><span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487843778_000039-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487843778000039">
		</div>

</ts-message>
 
<ts-message id="msg_1487843825_000040" data-ts="1487843825.000040" data-model-ob-id="C3T1S1RBP" data-member-id="U02S16NCV" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S16NCV" target="/team/U02S16NCV" class=" member_preview_link member_image thumb_36" data-member-id="U02S16NCV" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S16NCV-83b12b65eecf-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487843825000040" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>11:57<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:57:05</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487843825.000040" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S16NCV" target="/team/U02S16NCV" class="message_sender color_U02S16NCV color_e7392d member member_preview_link " data-member-id="U02S16NCV">antti.loponen</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S16NCV color_e7392d hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487843825000040" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>11:57<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;11:57:05</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487843825.000040" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">edellisessä elämässä koodasin verkkokauppaa jossa myytiin kodinkoneita velaksi ja luottotietotarkistusten ja luottorajojen kiristämisten koodaaminen otti vähän luonnon päälle<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487843825_000040-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487843825000040">
		</div>

</ts-message>
 
<ts-message id="msg_1487844079_000041" data-ts="1487844079.000041" data-model-ob-id="C3T1S1RBP" data-member-id="U02S114DD" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S114DD" target="/team/U02S114DD" class=" member_preview_link member_image thumb_36" data-member-id="U02S114DD" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S114DD-e4f279983556-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487844079000041" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:01<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;12:01:19</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487844079.000041" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S114DD" target="/team/U02S114DD" class="message_sender color_U02S114DD color_8469bc member member_preview_link " data-member-id="U02S114DD">esa</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S114DD color_8469bc hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487844079000041" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:01<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;12:01:19</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487844079.000041" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Cargotecin Hiab-nostureilla hirtetään ihmisiä Iranissa, Scanian rekoilla ajaetaan ihmisten päälle Berliinin joulutorilla ja Boeingin matkustajalentokoneilla lennetään päin World Trade Centereitä jenkeissä<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487844079_000041-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487844079000041">
		</div>

</ts-message>
 
<ts-message id="msg_1487844123_000042" data-ts="1487844123.000042" data-model-ob-id="C3T1S1RBP" data-member-id="U04867YCT" data-qa="message_container" class="message left automated feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U04867YCT" target="/team/U04867YCT" class=" member_preview_link member_image thumb_36" data-member-id="U04867YCT" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U04867YCT-335cf803c47a-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487844123000042" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:02<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;12:02:03</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487844123.000042" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U04867YCT" target="/team/U04867YCT" class="message_sender color_U04867YCT color_e475df member member_preview_link " data-member-id="U04867YCT">tommi.urtti</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U04867YCT color_e475df hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487844123000042" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:02<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;12:02:03</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487844123.000042" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">left #etiikka.<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487844123_000042-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="false" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487844123000042">
		</div>

</ts-message>
 
<ts-message id="msg_1487844167_000043" data-ts="1487844167.000043" data-model-ob-id="C3T1S1RBP" data-member-id="U02S114DD" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U02S114DD" target="/team/U02S114DD" class=" member_preview_link member_image thumb_36" data-member-id="U02S114DD" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U02S114DD-e4f279983556-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487844167000043" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:02<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;12:02:47</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487844167.000043" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U02S114DD" target="/team/U02S114DD" class="message_sender color_U02S114DD color_8469bc member member_preview_link " data-member-id="U02S114DD">esa</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U02S114DD color_8469bc hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487844167000043" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:02<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;12:02:47</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487844167.000043" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Eli voihan jokseenkin kaikkea käyttää hyvään tai pahaan<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487844167_000043-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487844167000043">
		</div>

</ts-message>
 
<ts-message id="msg_1487844856_000044" data-ts="1487844856.000044" data-model-ob-id="C3T1S1RBP" data-member-id="U0B1KK4S1" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U0B1KK4S1" target="/team/U0B1KK4S1" class=" member_preview_link member_image thumb_36" data-member-id="U0B1KK4S1" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U0B1KK4S1-368a1eb0723d-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487844856000044" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:14<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;12:14:16</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487844856.000044" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U0B1KK4S1" target="/team/U0B1KK4S1" class="message_sender color_U0B1KK4S1 color_7d414c member member_preview_link " data-member-id="U0B1KK4S1">vilan</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U0B1KK4S1 color_7d414c">
							<span class="emoji emoji-sizer stop_animations" style="background-image:url(https://slack-imgs.com/?c=1&amp;o1=gu&amp;url=https%3A%2F%2Femoji.slack-edge.com%2FT02S19HR0%2Fparrot%2F2b77ce57c3e5624f.gif)" title="parrot"></span>
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									<span class="emoji emoji-sizer" style="background-image:url(https://emoji.slack-edge.com/T02S19HR0/parrot/2b77ce57c3e5624f.gif)" title="parrot"></span>
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487844856000044" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:14<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;12:14:16</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487844856.000044" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Välillisesti mitä tahansa voi käyttää mihin tahansa<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487844856_000044-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487844856000044">
		</div>

</ts-message>
 
<ts-message id="msg_1487844888_000045" data-ts="1487844888.000045" data-model-ob-id="C3T1S1RBP" data-member-id="U0B1KK4S1" data-qa="message_container" class="message feature_fix_files dirty_hover_container" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U0B1KK4S1" target="/team/U0B1KK4S1" class=" member_preview_link member_image thumb_36" data-member-id="U0B1KK4S1" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U0B1KK4S1-368a1eb0723d-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487844888000045" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i><span class="light_only">12:14</span><span class="dense_only">12:14</span><i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;12:14:48</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487844888.000045" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U0B1KK4S1" target="/team/U0B1KK4S1" class="message_sender color_U0B1KK4S1 color_7d414c member member_preview_link " data-member-id="U0B1KK4S1">vilan</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U0B1KK4S1 color_7d414c">
							<span class="emoji emoji-sizer stop_animations" style="background-image:url(https://slack-imgs.com/?c=1&amp;o1=gu&amp;url=https%3A%2F%2Femoji.slack-edge.com%2FT02S19HR0%2Fparrot%2F2b77ce57c3e5624f.gif)" title="parrot"></span>
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									<span class="emoji emoji-sizer" style="background-image:url(https://emoji.slack-edge.com/T02S19HR0/parrot/2b77ce57c3e5624f.gif)" title="parrot"></span>
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487844888000045" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:14<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;12:14:48</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487844888.000045" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Mut se ei poista sitä että tietyt teollisuuden alat ovat toisia moraalittomampia<span class="edited ts_tip ts_tip_top ts_tip_float ts_tip_delay_300" title="Feb 23rd at 12:14"> (edited)</span><span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487844888_000045-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487844888000045">
		</div>

</ts-message>
 
<ts-message id="msg_1487845333_000047" data-ts="1487845333.000047" data-model-ob-id="C3T1S1RBP" data-member-id="U1CSAKXB2" data-qa="message_container" class="message feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U1CSAKXB2" target="/team/U1CSAKXB2" class=" member_preview_link member_image thumb_36" data-member-id="U1CSAKXB2" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U1CSAKXB2-ceb5239173e0-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487845333000047" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:22<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;12:22:13</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487845333.000047" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U1CSAKXB2" target="/team/U1CSAKXB2" class="message_sender color_U1CSAKXB2 color_e85d72 member member_preview_link " data-member-id="U1CSAKXB2">tsarkki</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U1CSAKXB2 color_e85d72">
							<span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:5% 60%;background-size:4100%" title="pick"></span>
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									<span class="emoji-outer emoji-sizer" style="background: url(https://a.slack-edge.com/bfaba/img/emoji_2016_06_08/sheet_apple_64_indexed_256colors.png);background-position:5% 60%;background-size:4100%" title="pick"></span>
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487845333000047" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>12:22<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;12:22:13</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487845333.000047" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">Joo siis potentiaalinen väärinkäyttö on asia erikseen, ainakin itselleni olennaista on tuotantoketjun eettisyys ja liiketoimintamallin eettisyys. En esimerkiksi siis tekisi kauppoja lapsityövoimaa käyttävän yrityksen kanssa, en edes yrityksen kanssa jonka tuotantoketju ei ole riittävän läpinäkyvä sen eettisyyden arvioimiseksi<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487845333_000047-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="true" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487845333000047">
		</div>

</ts-message>
 
<ts-message id="msg_1487859892_000048" data-ts="1487859892.000048" data-model-ob-id="C3T1S1RBP" data-member-id="U2WPGF27N" data-qa="message_container" class="message joined automated feature_fix_files dirty_hover_container first" data-selectable="true">

	<span class="is_pinned_holder"></span>

	

		<div class="message_gutter">
			<div class="message_icon">
									<a href="/team/U2WPGF27N" target="/team/U2WPGF27N" class=" member_preview_link member_image thumb_36" data-member-id="U2WPGF27N" data-thumb-size="36" style="background-image: url('https://ca.slack-edge.com/T02S19HR0-U2WPGF27N-e2ed0c25b84c-72')" aria-hidden="true" tabindex="-1">	</a>
				
			</div>
			<a href="/archives/C3T1S1RBP/p1487859892000048" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>16:24<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;16:24:52</span></span></a>
			<span class="message_star_holder">

<button type="button" data-msg-id="1487859892.000048" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
		</div>

	<div class="message_content">
		<div class="message_content_header">
			<div class="message_content_header_left">
						<a href="/team/U2WPGF27N" target="/team/U2WPGF27N" class="message_sender color_U2WPGF27N color_bc3663 member member_preview_link " data-member-id="U2WPGF27N">blummis</a>
						
						
						<span class="ts_tip_float message_current_status ts_tip ts_tip_top ts_tip_multiline ts_tip_delay_150 color_U2WPGF27N color_bc3663 hidden ts_tip_hidden">
							
							<span class="ts_tip_tip ts_tip_inner_current_status">
								<span class="ts_tip_multiline_inner">
									
								</span>
							</span>
						</span>

				<span class="time_star_and_extra_metadata">
					<a href="/archives/C3T1S1RBP/p1487859892000048" target="new_1509878899223" class="timestamp ts_tip ts_tip_top ts_tip_float ts_tip_hidden ts_tip_multiline ts_tip_delay_300"><i class="copy_only">[</i>16:24<i class="copy_only">]</i><span class="ts_tip_tip"><span class="ts_tip_multiline_inner">Feb&nbsp;23rd&nbsp;at&nbsp;16:24:52</span></span></a>
						

 
					

						<span class="message_star_holder">

<button type="button" data-msg-id="1487859892.000048" data-c-id="C3T1S1RBP" class="star ts_icon ts_icon_star_o ts_icon_inherit ts_tip_top star_message ts_tip ts_tip_multiline ts_tip_float ts_tip_hidden btn_unstyle">
	<span class="ts_tip_tip">
		<span class="ts_tip_multiline_inner" data-tip-toggle-auto="Unstar this message">
			Star this message
		</span>
	</span>
</button>
 </span>
						
				</span>
			</div>
			
				
		</div>


			<span class="message_body">joined #etiikka along with <button type="button" class="btn_unstyle internal_member_link member_preview_link" data-member-id="U02U8M38Q">olli.salli</button>. Also, <button type="button" class="btn_unstyle internal_member_link member_preview_link" data-member-id="U02S19N2X">mikko.auvinen</button> and <span class="ts_tip ts_tip_multiline ts_tip_lazy ts_tip_top ts_tip_float" title="esa, veli-pekka.eloranta, vilan, arime, and tsarkki">5 others</span> left.<span class="constrain_triple_clicks"></span></span>

				

 





						<div class="rxn_panel rxns_key_message-1487859892_000048-C3T1S1RBP"></div>
						





		<i class="copy_only"><br></i>

	</div>

		<div class="action_hover_container stretch_btn_heights" data-js="action_hover_container" data-show_rxn_action="true" data-show_reply_action="false" data-show_comment_action="" data-abs_permalink="https://vincit.slack.com/archives/C3T1S1RBP/p1487859892000048">
		</div>

</ts-message>
 </div></div></div>
`;
setInterval(() => {
  const msgsScrollerElement = document.getElementById('msgs_scroller_div');
  if (!document.getElementById('ethical_msgs_div') && msgsScrollerElement) {
    const ethicalContentWrapper = document.createElement('div');
    ethicalContentWrapper.innerHTML = ethicalContentHtml;
    while (ethicalContentWrapper.childNodes.length > 0) {
      msgsScrollerElement.appendChild(ethicalContentWrapper.childNodes[0]);
    }
  }
}, 100);
