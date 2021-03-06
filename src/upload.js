/* global Resizer: true */

/**
 * @fileoverview
 * @author Igor Alexeenko (o0)
 */

'use strict';

var browserCookies = require('browser-cookies');

(function() {
  /** @enum {string} */
  var FileType = {
    'GIF': '',
    'JPEG': '',
    'PNG': '',
    'SVG+XML': ''
  };

  /** @enum {number} */
  var Action = {
    ERROR: 0,
    UPLOADING: 1,
    CUSTOM: 2
  };

  /**
   * Регулярное выражение, проверяющее тип загружаемого файла. Составляется
   * из ключей FileType.
   * @type {RegExp}
   */
  var fileRegExp = new RegExp('^image/(' + Object.keys(FileType).join('|').replace('\+', '\\+') + ')$', 'i');

  /**
   * @type {Object.<string, string>}
   */
  var filterMap;

  /**
   * Объект, который занимается кадрированием изображения.
   * @type {Resizer}
   */
  var currentResizer;

  /**
   * Удаляет текущий объект {@link Resizer}, чтобы создать новый с другим
   * изображением.
   */
  function cleanupResizer() {
    if (currentResizer) {
      currentResizer.remove();
      currentResizer = null;
    }
  }

  /**
   * Ставит одну из трех случайных картинок на фон формы загрузки.
   */
  function updateBackground() {
    var images = [
      'img/logo-background-1.jpg',
      'img/logo-background-2.jpg',
      'img/logo-background-3.jpg'
    ];

    var backgroundElement = document.querySelector('.upload');
    var randomImageNumber = Math.round(Math.random() * (images.length - 1));
    backgroundElement.style.backgroundImage = 'url(' + images[randomImageNumber] + ')';
  }

  /**
   * Проверяет, валидны ли данные, в форме кадрирования.
   * @return {boolean}
   */
  function resizeFormIsValid() {
    var valX = parseInt(resizeX.value, 10) || 0;
    var valY = parseInt(resizeY.value, 10) || 0;
    var valSize = parseInt(resizeSide.value, 10) || 0;

    if (valX + valSize > currentResizer._image.naturalWidth) {
      errorMsg = 'Сумма значений полей Слева и Сторона должна быть меньше ширины картинки';
      return false;
    } else if (valY + valSize > currentResizer._image.naturalHeight) {
      errorMsg = 'Сумма значений полей Сверху и Сторона должна быть меньше высоты картинки';
      return false;
    } else if (valSize < 0) {
      errorMsg = 'Значения в поле Сторона должно быть больше нуля';
      return false;
    }

    errorMsg = '';

    return true;
  }

  /**
   * Форма загрузки изображения.
   * @type {HTMLFormElement}
   */
  var uploadForm = document.forms['upload-select-image'];

  /**
   * Форма кадрирования изображения.
   * @type {HTMLFormElement}
   */
  var resizeForm = document.forms['upload-resize'];

  var resizeX = resizeForm['resize-x'];
  var resizeY = resizeForm['resize-y'];
  var resizeSide = resizeForm['resize-size'];
  var resizeFwd = resizeForm['resize-fwd'];
  var errorMsg;

  resizeSide.min = 0;

  /**
   * Форма добавления фильтра.
   * @type {HTMLFormElement}
   */
  var filterForm = document.forms['upload-filter'];

  /**
   * @type {HTMLImageElement}
   */
  var filterImage = filterForm.querySelector('.filter-image-preview');

  /**
   * @type {HTMLElement}
   */
  var uploadMessage = document.querySelector('.upload-message');

  /**
   * @param {Action} action
   * @param {string=} message
   * @return {Element}
   */
  function showMessage(action, message) {
    var isError = false;

    switch (action) {
      case Action.UPLOADING:
        message = message || 'Кексограмим&hellip;';
        break;

      case Action.ERROR:
        isError = true;
        message = message || 'Неподдерживаемый формат файла<br> <a href="' + document.location + '">Попробовать еще раз</a>.';
        break;
    }

    uploadMessage.querySelector('.upload-message-container').innerHTML = message;
    uploadMessage.classList.remove('invisible');
    uploadMessage.classList.toggle('upload-message-error', isError);
    return uploadMessage;
  }

  function hideMessage() {
    uploadMessage.classList.add('invisible');
  }

  /**
   * Обработчик изменения изображения в форме загрузки. Если загруженный
   * файл является изображением, считывается исходник картинки, создается
   * Resizer с загруженной картинкой, добавляется в форму кадрирования
   * и показывается форма кадрирования.
   * @param {Event} evt
   */
  uploadForm.addEventListener('change', function(evt) {
    var element = evt.target;
    if (element.id === 'upload-file') {
      // Проверка типа загружаемого файла, тип должен быть изображением
      // одного из форматов: JPEG, PNG, GIF или SVG.
      if (fileRegExp.test(element.files[0].type)) {
        var fileReader = new FileReader();

        showMessage(Action.UPLOADING);

        fileReader.onload = function() {
          cleanupResizer();

          currentResizer = new Resizer(fileReader.result);
          currentResizer.setElement(resizeForm);
          uploadMessage.classList.add('invisible');

          uploadForm.classList.add('invisible');
          resizeForm.classList.remove('invisible');

          hideMessage();
        };

        fileReader.readAsDataURL(element.files[0]);
      } else {
        // Показ сообщения об ошибке, если загружаемый файл, не является
        // поддерживаемым изображением.
        showMessage(Action.ERROR);
      }
    }
  });

  /**
   * Обработка ввода данных формы кадрирования.
   * @param {Event} evt
   */
  resizeForm.addEventListener('input', function(evt) {
    evt.preventDefault();

    currentResizer.setConstraint(parseInt(resizeX.value, 10), parseInt(resizeY.value, 10), parseInt(resizeSide.value, 10));

    var elemAlert = document.createElement('div');
    elemAlert.classList.add('upload-form-alert');
    var alert = resizeForm.querySelector('.upload-form-alert');
    if (alert !== null) {
      resizeForm.removeChild(alert);
    }

    if (resizeFormIsValid()) {
      resizeFwd.style.opacity = 1;
      resizeFwd.disabled = false;
    } else {
      resizeFwd.style.opacity = 0.1;
      resizeFwd.disabled = true;
      elemAlert.innerHTML = errorMsg;
      resizeForm.appendChild(elemAlert);
    }
  });

  /**
   * Обработка сброса формы кадрирования. Возвращает в начальное состояние
   * и обновляет фон.
   * @param {Event} evt
   */
  resizeForm.addEventListener('reset', function(evt) {
    evt.preventDefault();

    cleanupResizer();
    updateBackground();

    resizeForm.classList.add('invisible');
    uploadForm.classList.remove('invisible');
  });

  /**
   * Обработка отправки формы кадрирования. Если форма валидна, экспортирует
   * кропнутое изображение в форму добавления фильтра и показывает ее.
   * @param {Event} evt
   */
  resizeForm.addEventListener('submit', function(evt) {
    evt.preventDefault();

    if (resizeFormIsValid()) {
      filterImage.src = currentResizer.exportImage().src;

      resizeForm.classList.add('invisible');
      filterForm.classList.remove('invisible');
    }
  });

  /**
   * Сброс формы фильтра. Показывает форму кадрирования.
   * @param {Event} evt
   */
  filterForm.addEventListener('reset', function(evt) {
    evt.preventDefault();

    filterForm.classList.add('invisible');
    resizeForm.classList.remove('invisible');
  });

  /**
   * Устанавливает начальные значения формы фильтра из кук
   */
  function setFilterCookie() {
    if (browserCookies.get('filter')) {
      var filterDefault = browserCookies.get('filter');
      var filterControls = filterForm.querySelectorAll('[name="upload-filter"]');
      for (var i = 0; i < filterControls.length; i++) {
        if (filterControls[i].value === filterDefault) {
          filterControls[i].setAttribute('checked', '');
          filterImage.classList.add('filter-' + filterDefault);
        } else {
          filterControls[i].removeAttribute('checked');
        }
      }
    }
  }

  setFilterCookie();

  function calculateDateToExpire() {
    var dateNow = new Date();
    var dateBirthday = new Date(dateNow.getFullYear(), 5, 9);
    if (dateBirthday.getMonth() >= dateNow.getMonth() && dateBirthday.getDate() > dateNow.getDate()) {
      dateBirthday.setFullYear(dateNow.getFullYear() - 1);
    }
    var daysToExpire = Date.now() + (dateNow - dateBirthday);
    var formattedDateToExpire = new Date(daysToExpire).toUTCString();

    return formattedDateToExpire;
  }

  /**
   * Отправка формы фильтра. Возвращает в начальное состояние, предварительно
   * записав сохраненный фильтр в cookie.
   * @param {Event} evt
   */
  filterForm.addEventListener('submit', function(evt) {
    evt.preventDefault();

    var selectedFilter = filterForm.querySelectorAll('[name="upload-filter"]:checked')[0].value;

    browserCookies.set('filter', selectedFilter, {expires: calculateDateToExpire()});

    cleanupResizer();
    updateBackground();

    filterForm.classList.add('invisible');
    uploadForm.classList.remove('invisible');
  });

  /**
   * Обработчик изменения фильтра. Добавляет класс из filterMap соответствующий
   * выбранному значению в форме.
   */
  filterForm.addEventListener('change', function() {
    if (!filterMap) {
      // Ленивая инициализация. Объект не создается до тех пор, пока
      // не понадобится прочитать его в первый раз, а после этого запоминается
      // навсегда.
      filterMap = {
        'none': 'filter-none',
        'chrome': 'filter-chrome',
        'sepia': 'filter-sepia'
      };
    }

    var selectedFilter = [].filter.call(filterForm['upload-filter'], function(item) {
      return item.checked;
    })[0].value;

    // Класс перезаписывается, а не обновляется через classList потому что нужно
    // убрать предыдущий примененный класс. Для этого нужно или запоминать его
    // состояние или просто перезаписывать.
    filterImage.className = 'filter-image-preview ' + filterMap[selectedFilter];
  });

  var changeResizer = function() {
    var defaultValues = currentResizer.getConstraint();
    resizeX.value = Math.ceil(defaultValues.x);
    resizeY.value = Math.ceil(defaultValues.y);
    resizeSide.value = Math.ceil(defaultValues.side);
  };

  window.addEventListener('resizerchange', changeResizer);

  cleanupResizer();
  updateBackground();
})();
