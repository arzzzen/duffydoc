<?php
	error_reporting(E_ALL);
	ini_set('display_errors', 1);

  try {
    require "DocXDocument.php";
    $doc = new DocXDocument('test.docx');
    echo "<br>", $doc->render(
    	array( array(
    		'value' => 'TestVar1',
    		'replace' => 'WowItsWork',
    		'matchNumber' => 1))), "<br>";
  } catch (Exception $e) {
    echo 'error '.$e->getMessage();
  }
?>