'use strict';

/*
 * Queuebird shell prototype.
 * Workspace switching only: no storage, no network, no account access.
 */
(function () {
  var doc = document;
  var nav = doc.querySelector('.rail');
  var links = Array.prototype.slice.call(doc.querySelectorAll('[data-workspace-link]'));
  var sections = Array.prototype.slice.call(doc.querySelectorAll('.workspace'));
  var announcer = doc.getElementById('workspace-announcer');
  var workspaceIds = sections.map(function (section) {
    return section.id;
  });

  function idFromHash() {
    var id = window.location.hash.replace(/^#/, '');
    return workspaceIds.indexOf(id) === -1 ? workspaceIds[0] : id;
  }

  function activate(id, options) {
    var settings = options || {};
    var targetId = workspaceIds.indexOf(id) === -1 ? workspaceIds[0] : id;

    sections.forEach(function (section) {
      var isActive = section.id === targetId;
      section.hidden = !isActive;
      section.classList.toggle('is-active', isActive);
    });

    links.forEach(function (link) {
      if (link.getAttribute('href') === '#' + targetId) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    if (settings.announce && announcer) {
      var heading = doc.getElementById(targetId + '-heading');
      var label = heading ? heading.textContent : targetId;
      announcer.textContent = label + ' workspace shown.';
    }

    if (settings.focusHeading) {
      var targetHeading = doc.getElementById(targetId + '-heading');
      if (targetHeading) {
        targetHeading.focus({ preventScroll: true });
      }
    }
  }

  function selectWorkspace(id, focusHeading) {
    activate(id, { focusHeading: focusHeading });
    if (window.location.hash !== '#' + id) {
      window.location.hash = id;
    }
  }

  links.forEach(function (link) {
    link.addEventListener('click', function (event) {
      var id = link.getAttribute('href').replace(/^#/, '');
      if (workspaceIds.indexOf(id) === -1) {
        return;
      }
      event.preventDefault();
      selectWorkspace(id, true);
    });
  });

  if (nav) {
    nav.addEventListener('keydown', function (event) {
      var index = links.indexOf(event.target);
      if (index === -1) {
        return;
      }

      var nextIndex = null;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        nextIndex = (index + 1) % links.length;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        nextIndex = (index - 1 + links.length) % links.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = links.length - 1;
      }

      if (nextIndex === null) {
        return;
      }

      event.preventDefault();
      links[nextIndex].focus();
    });
  }

  window.addEventListener('hashchange', function () {
    activate(idFromHash(), { announce: true });
  });

  activate(idFromHash(), { announce: false });
})();
