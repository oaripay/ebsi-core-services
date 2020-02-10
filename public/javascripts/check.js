/* eslint-disable no-use-before-define, no-alert */
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
/* eslint-enable no-use-before-define, no-alert */

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
    var pathcheck = pathname + '/check';
    var xhr = new XMLHttpRequest();
    // demo/demo/eu-funding/verifyfile
    if (pathname === '/demo/eu-funding' || pathname === '/notary') {
      console.log(pathname);
      xhr.open('POST', pathcheck, true);
      // xhr.open("POST", "/demo/eu-funding/check", true);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.send(JSON.stringify({
        Jwt: localStorage.getItem('Jwt'),
        Did: localStorage.getItem('Did')
      }));
    }
  }
}

/*
function setLogin() {
  let jwt = 'eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJqa3UiOiJodHRwczovL2FwaS5lYnNpLnh5ei9lYnNpdHJ1c3RlZGFwcC9wdWJsaWMta2V5cy8iLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJzdWIiOiJuMDAyeTVnOCIsImlhdCI6MTU4MDk4MDQyNiwiZXhwIjoxNTgxMDY2ODI2LCJhdWQiOiJlYnNpLXdhbGxldCIsImRpZCI6ImRpZDplYnNpOjB4MDI0MmNFYzE1NEE0NDg3Nzk4NDU3QTg4RTU0RDNmMjlCYjQwQjA2NSIsInVzZXJOYW1lIjoiUmFuaXJpaGFyaXNvbiZSb2h5IiwidXNlcklkIjoibjAwMnk1ZzgifQ.oWLk7x3Tb2v9xSUTmPoPwQOFAwFrvgxiCTjj2xnUGLCaOA_JpITgyOo4p3dbMjSrFpMnWGGUz1BlVbIwHXUrlA';
  let did = 'did:ebsi:0x0242cEc154A4487798457A88E54D3f29Bb40B065';
  localStorage.setItem('Jwt', jwt);
  localStorage.setItem('Did', did);
}
setLogin();
*/
