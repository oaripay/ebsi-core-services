/* eslint-disable no-unused-vars, no-undef, no-use-before-define, no-param-reassign, no-plusplus, no-loop-func, no-alert */
function ValidateSize(file) {
  var FileSize = file.files[0].size / 1024 / 1024; // in MB
  //   var testa = Math.round((file.files[0].size / 1024 / 1024));
  //   console.log(testa, ' File size exceeds 6 MB ', file.files[0].size, ' ; ', FileSize);
  $('#myBox').hide();
  $('#myBox2').hide();
  $('#myBox3').hide();
  if (FileSize > 6) {
    //            alert('File size exceeds 6 MB');
    document.getElementById('myBox').style.display = 'block';
    // $('#myBox').show();
    $(file).val('');
  }
}


function addjwt(myFormId) {
  console.log('***myFormId***', myFormId);
  // var form = addDataToForm('myFormId', {
  var form = addDataToForm(myFormId, {
    forlog: window.location.href,
    myFormId: myFormId,
    jwt: localStorage.getItem('Jwt'),
    did: localStorage.getItem('Did')
  });
}

function addDataToForm(form, data) {
  if (typeof form === 'string') {
    if (form[0] === '#') form = form.slice(1);
    form = document.getElementById(form);
  }

  var keys = Object.keys(data);
  var name;
  var value;
  var input;

  for (var i = 0; i < keys.length; i++) {
    name = keys[i];
    // removing the inputs with the name if already exists [overide]
    // console.log(form);
    Array.prototype.forEach.call(form.elements, function (inpt) {
      if (inpt.name === name) {
        inpt.parentNode.removeChild(inpt);
      }
    });

    value = data[name];
    input = document.createElement('input');
    input.setAttribute('name', name);
    input.setAttribute('value', value);
    input.setAttribute('type', 'hidden');

    form.appendChild(input);
  }

  return form;
}


// ------------------------------------------------------------------------------------------------


// console.log('*****************');
let jwtold = null;
let didold = null;
let send = false;
function storageAvailable(type) {
  var storage;
  try {
    storage = window[type];
    var x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return e instanceof DOMException && (
    // everything except Firefox
      e.code === 22
            // Firefox
            || e.code === 1014
            // test name field too, because code might not be present
            // everything except Firefox
            || e.name === 'QuotaExceededError'
            // Firefox
            || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
            // acknowledge QuotaExceededError only if there's something already stored
            && (storage && storage.length !== 0);
  }
}

if (storageAvailable('localStorage')) {
  // Yippee! We can use localStorage awesomeness
  console.log('// Yippee! We can use localStorage awesomeness');
  check();
} else {
  // Too bad, no localStorage for us
  console.log('// Too bad, no localStorage for us');
  alert('your privacy protocol doesn\'t allow some functionality!!!');
}


function check() {
  var pathname = window.location.pathname;

  // console.log(pathname);

  console.log(' > ', localStorage.getItem('Jwt'));

  if (localStorage.getItem('Jwt') !== null && localStorage.getItem('Did') !== null) {
    if (jwtold === localStorage.getItem('Jwt') && didold === localStorage.getItem('Did')) {
      send = false;
    } else {
      jwtold = localStorage.getItem('Jwt');
      didold = localStorage.getItem('Did');
      send = true;
    }
  }

  if (send) {
    //     var pathcheck = pathname + '/check';

    var xhr = new XMLHttpRequest();
    // demo/demo/eu-funding/verifyfile

    if (pathname === '/demo/eu-funding' || pathname === '/notary') {
      console.log('*** ', pathname, ' ***');
      //       console.log(pathname);
      //       xhr.open('POST', pathcheck, true);
      xhr.open('POST', '/demo/eu-funding', true);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          // console.log(xhr.response);
          var doc = new DOMParser().parseFromString(xhr.response, 'text/html');
          var main = [].slice.call(doc.body.getElementsByTagName('main'))[0];
          $('main').html(main);
        }
      };

      xhr.send(JSON.stringify({
        jwt: localStorage.getItem('Jwt'),
        did: localStorage.getItem('Did')
      }));
    }
  }
}
/* eslint-enable no-unused-vars, no-undef, no-use-before-define, no-param-reassign, no-plusplus, no-loop-func, no-alert */

//--------------------------------------------------------------------------------------------------------------------------------------------------
/*
function setLogin() {
  let jwt = 'eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJqa3UiOiJodHRwczovL2FwaS5lYnNpLnh5ei9lYnNpdHJ1c3RlZGFwcC9wdWJsaWMta2V5cy8iLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJzdWIiOiJnb256anVsIiwiaWF0IjoxNTgxMDA2OTYxLCJleHAiOjE1ODEwOTMzNjEsImF1ZCI6ImVic2ktd2FsbGV0IiwiZGlkIjoiZGlkOmVic2k6MHg1OGE0M0UwYmY5NTFBODM1YUIzQTJlOTdjRkZkREU2Q0NjN0U3NkJGIiwidXNlck5hbWUiOiJHT05aQUxFWiBBR1VERUxPJkp1bGlhbiIsInVzZXJJZCI6ImdvbnpqdWwifQ.kkvl7D6bDlbLAUopQ4SvrVJOS1KOGFxaBCaSUn0Uj8oohHPRa5pR809FvLsWGlaEd-hMD5wh28k5BYwuI8Ts3A';
  let did = 'did:ebsi:0x58a43E0bf951A835aB3A2e97cFFdDE6CCc7E76BF';
  localStorage.setItem('Jwt', jwt);
  localStorage.setItem('Did', did);
}
setLogin();
*/
