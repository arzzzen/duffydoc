$(function() {

	var $dropZone = $('#dropZone'),
			$msg = $('#msg'),
			$fileForm = $('#fileForm'),
			$userFile = $('#userFile');

	$userFile.change(function() {
    $msg.html('').addClass('progress');
    var formData = new FormData($fileForm[0]);
    $.ajax({
      type: 'POST',
      url: $fileForm.attr("action"),
      data: formData,
      dataType: 'json',
      success: function(data) {
        var id,
            url,
            urlvalue = {};

        if (data.error) {
          alert(data.error);
          $msg.html('Drop docx here!').removeClass('progress');
          return;
        }
        urlvalue = {
          d: data.id,
          f: data.saved_file_name,
          n: data.file_name
        }
        url = $.map(urlvalue, function(v, k) {
            return encodeURIComponent(k) + '=' + encodeURIComponent(v);
        }).join('&');
        window.location = '/app/?'+ url;
      },
      cache: false,
      contentType: false,
      processData: false
    })
	});
})