console.log('*****************');
function storageAvailable(type) {
    var storage;
    try {
        storage = window[type];
        var x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch(e) {
        return e instanceof DOMException && (
            // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === 'QuotaExceededError' ||
            // Firefox
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            (storage && storage.length !== 0);
    }
}

if (storageAvailable('localStorage')) {
  // Yippee! We can use localStorage awesomeness
  console.log('// Yippee! We can use localStorage awesomeness');
  check();
}
else {
  // Too bad, no localStorage for us
  console.log('// Too bad, no localStorage for us');
  alert('your privacy protocol doesn\'t allow some functionality!!!');
}

function check() {
  var pathname = window.location.pathname;

  // console.log(pathname);

  console.log(' > ', localStorage.getItem('Jwt'));


  var pathcheck = pathname + '/check';
  var xhr = new XMLHttpRequest();

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

