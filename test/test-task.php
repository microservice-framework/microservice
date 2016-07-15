<?php


$data = array(
  "owner" => "Gormartsen",
  "repository" => "php.of.by",
  "status" => -1,
  "description" => "starting up",
  "summary" => "",
  "branch" => "master",
  "sha" => "fb42836c8a8a851c5e13a4632c0a1801e7794ab2",
  "context" => "zenci/deploy/master",
  "interrupt" => FALSE,
);




zenci_put_request($data);


/**
 * Submit a POST request to Zen.ci updating its current status.
 *
 * @param array $data
 *   An array of data to push to Zen.ci. Should include the following:
 *   - state: One of "error", "success", or "pending".
 *   - message: A string summary of the state.
 *   - summary: Optional. A longer description of the state.
 */
function zenci_put_request($data) {
  $token = getenv('ZENCI_TOKEN');
  $status_url = getenv('ZENCI_WORKER_URL');

  $data = json_encode($data);

  $ch = curl_init();

  curl_setopt($ch, CURLOPT_URL, $status_url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
//  curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST"); // Note the PUT here.

  curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
  curl_setopt($ch, CURLOPT_HEADER, true);

  curl_setopt($ch, CURLOPT_HTTPHEADER, array(
      'Content-Type: application/json',
      'Token: ' . $token,
      'Content-Length: ' . strlen($data)
  ));
  $result = curl_exec($ch);
  print_r($result);
  curl_close($ch);
}
