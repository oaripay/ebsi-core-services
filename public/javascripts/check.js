console.log('*****************');


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

check();
