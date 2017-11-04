let inPetriChannel = false;
function checkIfInPetri() {
  if (activeChannelNameButton && activeChannelNameButton.innerText === '#petri') {
    if (!inPetriChannel) {
      inPetriChannel = true;
      alert('in petri channel');
    }
  } else {
    inPetriChannel = false;
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
  subtree: true,
  attributes: true
});
checkIfInPetri();
