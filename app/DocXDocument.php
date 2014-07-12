<?php
/**
 * Класс DocXDocument служит для замены слов
 * в docx файлах по конкретным значениям слов или по регулярным вхождениям. 
 * 
 * @author arzzzen
 *
 */
class DocXDocument extends ZipArchive{

    public $path;

    // DOMDocument
    private $doc;

    private $t_nodes;

    /**
     * Конструктор который создает копию файла-шаблона
     * и наполняет $t_nodes текстовыми нодами из docx.
     * @param $template_file
     * @param $dest_file имя файла для сохранения изменения
     */
    public function __construct($template_file, $dest_file = "result.docx"){
      if (!copy($template_file, $dest_file)) {
        throw new Exception("Can't copy $template_file to $dest_file");
      }

      $this->open($dest_file);

      $this->path = $template_file;

      $this->doc = new DOMDocument();

      $this->t_nodes = $this->doc->getElementsByTagNameNS('*','t');

    }

     /**
     * Заменяет вхождения $replace
     * и наполняет $t_nodes текстовыми нодами из docx.
     * @param $replace array Массив ключ - переменная, значение - значение переменной
     * @param $mathes Массив массивов элементов где 0 индекс- переменная, 1 индекс - смещение,
     * а 3 - номер среди всех вхождений перемменной в документе
     *
     * @param $replace array Массив объектов с ключами value, replace, macthNumber
     */
    public function render(array $replaceAr) {
      $matches = array();

      // $values = array_map(function($var) {
      //   return $var['value'];
      // }, $replaceAr);

      // $valuesQuoted = array_map(function($key){
      //     return preg_quote($key, '/');
      // }, $values);

      // $replace = array_map(function($var) {
      //   return $var['replace'];
      // }, $replaceAr);

      $doc_file = 'zip://'.$this->path.'#word/document.xml';

      if (!$this->doc->loadXML (file_get_contents($doc_file)))
        throw new Exception('Unable to read word/document.xml from template');

      $dom_text = $this->getDomText();
      //echo "<pre> Text <br>",var_dump($dom_text),"</pre>";

      foreach ($replaceAr as $var) {
        $matchVar = array();
        preg_match_all('/'.preg_quote($var['value']).'/', $dom_text, $matchVar, PREG_OFFSET_CAPTURE);
        $matches[] = array($var['value'], $matchVar[0][$var['matchNumber']][1]);
      }
      //echo "<pre> Matches <br>",var_dump($matches),"</pre>";

      $this->normalizeXML($matches);

      $doc_content = $this->doc->saveXML();

      //$doc_content = preg_replace('/[\n\r]/', ' ', $doc_content);
      //die($doc_content);

      foreach ($replaceAr as $var) {
        $doc_content = $this->str_replace_nth($var['value'], $var['replace'], $doc_content, $var['matchNumber']);
      }


      $this->addFromString("word/document.xml", $doc_content);

      return '$changesCount';

      // $matches = array();
      // $keys = array_map(function($value){
      //     return preg_quote($value, '/');
      // }, array_keys($replace));
      // $values = array_values($replace);

      // $doc_file = 'zip://'.$this->path.'#word/document.xml';

      // if (!$this->doc->loadXML (file_get_contents($doc_file)))
      //   throw new Exception('Unable to read word/document.xml from template');

      // if (is_null($matches)) {
      //   $dom_text = $this->getDomText();
      //   preg_match_all('/'.implode('|', $keys).'/', $dom_text, $matches, PREG_OFFSET_CAPTURE);
      //   $matches = $matches[0];
      // }

      // $this->normalizeXML($matches);

      // $doc_content = $this->doc->saveXML();

      // if (is_null($matches)) {
      //   $doc_content = str_replace(array_keys($replace), array_values($replace), $doc_content, $changesCount);
      // } else {

      // }


      // $this->addFromString("word/document.xml", $doc_content);

      // return $changesCount;
    }

    private function str_replace_nth($search, $replace, $subject, $nth)
    {
        $found = preg_match_all('/'.preg_quote($search).'/', $subject, $matches, PREG_OFFSET_CAPTURE);
        if (false !== $found && $found > $nth) {
            return substr_replace($subject, $replace, $matches[0][$nth][1], strlen($search));
        }
        return $subject;
    }

    /**
     * Из текстовых нод $t_nodes создает текстовую строку.
     * @return string
     */
    private function getDomText() {
      $text = '';

      foreach ($this->t_nodes as $t)
          $text .= $t->nodeValue;
      return $text;
    }

    /**
     * Для каждого элемента $matches проверяет - не находится ли
     * в разных нодах. Если да - в первый нод который содержит начало
     * элемента дописывает элемент, а из нодов содержащих остальные части
     * элемента удаляет их.
     * @param $matches array Массив содержащий массивы со значениями слова и смещения слов
     */

    private function normalizeXML($matches) {
      $t_nodes_array = array();

      foreach ($this->t_nodes as $t_node) {
        array_push($t_nodes_array, array(
          'value' => $t_node->nodeValue,
          'length' => mb_strlen($t_node->nodeValue)
          ));
      }

      $nodes_to_concat = array();
      $nodes_to_concat_index = 0;

      foreach ($matches as $match) {
        $match_offset = $match[1];
        $match_len = mb_strlen($match[0]);
        $nodeOffset = 0;

        foreach ($t_nodes_array as $index => $t_node) {
          if ($match_offset > $nodeOffset) {
            $nodeOffset += $t_node['length'];
          } else {
            if ($t_node['length'] < $match_len) {
              $nodes_len_sum = 0;
              $i = $index;
              while ($nodes_len_sum < $match_len) {
                $nodes_len_sum += $t_nodes_array[$i]['length'];
                $nodes_to_concat[$nodes_to_concat_index][] = $i;
                $i++;
              }

              // последний элемент массива нодов для конкатенации - размер остатка переменой в последнем ноде
              $nodes_to_concat[$nodes_to_concat_index][] = $t_nodes_array[--$i]['length'] - ($nodes_len_sum - $match_len);
              $nodes_to_concat_index++;
            }
            break;
          }
        }
      }
      //echo "<pre>",var_dump($nodes_to_concat),"</pre>";
      $this->concatNodes($nodes_to_concat);
    }

    /**
     * Функция получает массив элементов содержащих массивы индексов текстовых нод
     * для конкатенациии добавляет в ноду по первому индексу тест из остальных, кроме последней ноды.
     * Из последней ноды добавляется и удаляется только оставшееся количество символов переменной.
     * Из остальных нод текст удаляется, кроме последней, из которой удаляется только необходимое количество символов.
     * @param $nodes_to_concat array Массив массиво индексов нод для объединеиния
     */
    private function concatNodes(array $nodes_to_concat) {
      foreach ($nodes_to_concat as $nodes) {
        $lastNodeIndex = count($nodes)-1;
        foreach ($nodes as $index => $node_index) {
          if ($index != 0 && $index != $lastNodeIndex) {
            if ($index != $lastNodeIndex-1) {
              $this->t_nodes->item($nodes[0])->nodeValue .= $this->t_nodes->item($node_index)->nodeValue;
              $this->t_nodes->item($node_index)->nodeValue = '';
            } else {
              $this->t_nodes->item($nodes[0])->nodeValue .= mb_substr($this->t_nodes->item($node_index)->nodeValue, 0, $nodes[$lastNodeIndex]);
              $this->t_nodes->item($node_index)->nodeValue = mb_substr($this->t_nodes->item($node_index)->nodeValue, $nodes[$lastNodeIndex]+1);
            }
          }
        }
      }
    }
}