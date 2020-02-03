function ValidateSize(file) {
        var FileSize = file.files[0].size / 1024 / 1024; // in MB
        var testa = Math.round((file.files[0].size/1024/ 1024));
        console.log(testa,' File size exceeds 6 MB ',file.files[0].size, ' ; ', FileSize);
        $('#myBox').hide();
        if (FileSize > 6) {
//            alert('File size exceeds 6 MB');
document.getElementById("myBox").style.display="block";
// $('#myBox').hide();
           $(file).val(''); //for clearing with Jquery
//            console.log('File size exceeds 6 MB ? ',file.files[0].size, ' ; ', FileSize);
        } else {

        }
    }