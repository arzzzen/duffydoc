<?php
if ($_GET) {
  $tmpl_file = $_SERVER['DOCUMENT_ROOT'].DIRECTORY_SEPARATOR.'app'.DIRECTORY_SEPARATOR.'tmpl'.DIRECTORY_SEPARATOR.'app.html';
  $app = file_get_contents($tmpl_file);

  echo str_replace('{$settings}', json_encode($_GET), $app);
} else {
  $docDir = $_SERVER['DOCUMENT_ROOT'].DIRECTORY_SEPARATOR.'upload'.DIRECTORY_SEPARATOR.$_POST['settings']['d'];
  $docName = $_POST['settings']['f'].'.docx';
  $docTitle = $_POST['settings']['n'];
  $filename = $docDir.DIRECTORY_SEPARATOR.$docName;

  require 'DocXDocument.php';

  $docXDoc = new DocXDocument($filename,  $docDir.DIRECTORY_SEPARATOR.'modified.docx');

  $variables = json_decode($_POST['variables'], true);

  $docXDoc->render($variables);

  echo '/upload/'.$_POST['settings']['d'].'/'.'modified.docx';

    /*if (file_exists($filename)) {
      // сбрасываем буфер вывода PHP, чтобы избежать переполнения памяти выделенной под скрипт
      // если этого не сделать файл будет читаться в память полностью!
      if (ob_get_level()) {
        ob_end_clean();
      }
      // заставляем браузер показать окно сохранения файла
      header('Content-Description: File Transfer');
      header('Content-Type: application/octet-stream');
      header('Content-Disposition: attachment; filename=' . basename($filename));
      header('Content-Transfer-Encoding: binary');
      header('Expires: 0');
      header('Cache-Control: must-revalidate');
      header('Pragma: public');
      header('Content-Length: ' . filesize($filename));
      // читаем файл и отправляем его пользователю
      readfile($filename);
      exit;
    }*/
}
?>