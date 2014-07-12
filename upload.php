<?php

$uploads_dir = $_SERVER['DOCUMENT_ROOT'].DIRECTORY_SEPARATOR.'upload';

try {
    if (!$_FILES) throw new Exception('No file uploaded');
    if (!is_uploaded_file($_FILES['userFile']['tmp_name'])) throw new Exception('File not saved');

    $file_name = $_FILES['userFile']['name'];
    $extension = pathinfo($file_name, PATHINFO_EXTENSION);
    $tmp_name = $_FILES["userFile"]["tmp_name"];

    $allowed_extensions = array('docx');

    if (!in_array($extension, $allowed_extensions)) throw new Exception('This type of file is not allowed ');

    $id = rand ( 1000000, 9999999 );

    $id_dir = $uploads_dir.DIRECTORY_SEPARATOR.$id;

    if (!mkdir($id_dir))  throw new Exception("Can't create id folder");

    $file_id = rand ( 1000000, 9999999 );
    $saved_file_name = "$file_id.$extension";

    if (!move_uploaded_file($tmp_name, "$id_dir/$saved_file_name")) throw new Exception("Can't move uploaded file ".$tmp_name." ".$id_dir);

    putenv('PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/opt/node/bin');
    passthru("/usr/bin/unoconv -f html $id_dir/$saved_file_name 2>&1", $terminal_resp);
    if ($terminal_resp != "0") throw new Exception("Error in convertion");

    echo json_encode(array(
       'id' => $id,
       'saved_file_name' => $file_id,
       'file_name' => $file_name
     ));

} catch (Exception $e) {
    echo json_encode(array(
      'error' => $e->getMessage()
    ));
}

?>
