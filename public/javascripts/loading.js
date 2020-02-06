var url = window.location.href;
var originalUrl = decodeURI(url);
// console.log('********loading*********', window.location);
// console.log('******** obj *********', Object.fromEntries(new URLSearchParams(location.search)));
// console.log('******** ? *********\n', location.search);

var oob = Object.fromEntries(new URLSearchParams(location.search));
//console.log(_.VERSION);

_.merge(oob,{done:true});
//console.log('******** oob *********', oob);

setTimeout(function(){ sendDone(oob); }, 10000);

function sendDone(oob){
  var xhr = new XMLHttpRequest();
xhr.open('POST', '/demo/eu-funding/receive-hash-done', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.onreadystatechange = function () {
  if (xhr.readyState === 4 && xhr.status === 200) {
    var doc = new DOMParser().parseFromString(xhr.response, 'text/html');
    var main = [].slice.call(doc.body.getElementsByTagName('main'))[0];
    $('main').html(main);
  }
};
xhr.send(JSON.stringify(oob));
}

