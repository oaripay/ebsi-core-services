var url = window.location.href;
var originalUrl = decodeURI(url);
console.log('********loading*********', window.location);
console.log('******** obj *********', Object.fromEntries(new URLSearchParams(location.search)));

var oob = Object.fromEntries(new URLSearchParams(location.search));

var xhr = new XMLHttpRequest();
xhr.open("POST", "/demo/eu-funding/receive-hash-done", true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.onreadystatechange = function(){
  if (xhr.readyState === 4 && xhr.status === 200) {
    console.log(xhr.response);
    $("html").html(xhr.response);
  }
};
xhr.send(JSON.stringify(oob));
