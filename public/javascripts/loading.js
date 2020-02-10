/* eslint-disable no-undef, no-restricted-globals, no-use-before-define */

var oob = _.chain(location.search)
  .replace('?', '')
  .split('&')
  .map(_.partial(_.split, _, '=', 2))
  .fromPairs()
  .value();

_.merge(oob, { done: true });
console.log('******** oob *********', oob);

setTimeout(function () { sendDone(oob); }, 10000);

function sendDone(oob) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/demo/eu-funding/receive-hash-done', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
    // console.log(xhr.response);
      var doc = new DOMParser().parseFromString(xhr.response, 'text/html');
      var main = [].slice.call(doc.body.getElementsByTagName('main'))[0];
      $('main').html(main);
    }
  };
  xhr.send(JSON.stringify(oob));
}
/* eslint-enable no-undef, no-restricted-globals, no-use-before-define */
