export function toggleModal(modalEl, stateObj) {
  if (!modalEl || stateObj.isAnimating) return null;

  const isHidden = modalEl.classList.contains('hidden');
  const modalContent = modalEl.querySelector('[class*="bg-"]');
  stateObj.isAnimating = true;

  if (isHidden) {
    modalEl.classList.remove('hidden');
    if (modalContent) {
      modalContent.style.transform = 'scale(0.95) translateY(20px)';
      modalContent.style.opacity = '0';
      modalContent.offsetHeight;
      requestAnimationFrame(() => {
        modalContent.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        modalContent.style.transform = 'scale(1) translateY(0)';
        modalContent.style.opacity = '1';
      });
    }
    setTimeout(() => {
      stateObj.isAnimating = false;
    }, 400);
  } else {
    if (modalContent) {
      modalContent.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      modalContent.style.transform = 'scale(0.95) translateY(10px)';
      modalContent.style.opacity = '0';
    }
    setTimeout(() => {
      modalEl.classList.add('hidden');
      stateObj.isAnimating = false;
    }, 300);
  }

  return isHidden;
}
