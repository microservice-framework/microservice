<?php


$data = array(
  'task' => 'test',
  'data' => array(
    "owner" => "Gormartsen",
    "repository" => "php.of.by",
    "private" => false,
    "token" => "4255119b61827d71ba8aebef0c98d21d6d45b53c",
    "sha" => "fb42836c8a8a851c5e13a4632c0a1801e7794ab2",
    "branch" => "master",
    "context" => "zenci/deploy/master",
    "action" => "push",
    "timeline_id" => "none",
//    "pr" => "1",
    "config" => array(
      "timeout" => 5000,
      "server" => "karma.vps-private.net",
      "username" => "zenci",
      "dir" => "{home}/github/{repo_owner}/{repo_name}/{branch}",
      "env_vars" => array(
        "docroot" => "{home}/domains/phpofby.examples.zen.ci",
        "domain" => "phpofby.examples.zen.ci",
      ),
      "scripts" => array(
        "after" => "/home/test/test.php",
        "init" => "/home/test/test.php",
        "fail" => "/home/test/test.php",
        "before" => "/home/test/test.php",
      ),
      "tests" => array(
        '{deploy_dir}/bin/run_test.sh',
      ),

      "webhooks" => array(
        "before" => "http://486.production.qa.git.lc/test.php",
        "init" => "http://486.production.qa.git.lc/test.php",
        "fail" => "http://486.production.qa.git.lc/test.php",
        "after" => "http://486.production.qa.git.lc/test.php",
      )
    ),
    "privateKey" => "-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQC7sDvyMuTF33aSUoTgT7Ar5sm/TfVNQEKmQS/Vyn4P7hJcdwsj
ex2+8G07S+WvWkkRIqi6LFHgdvAkgFY1kSoXnMNEMh5cWJhNdAC9gSywUB0fWzBu
c6XjyCqNTHF9AA3ESHCZj/FmqFffYT1dG0GfG4/yH1vdNWwrqfO98Br9PQIDAQAB
AoGBAIWfKG58MUd2mnH98b/IvAHlYwihtdxzvX+jtSyd5zXsJoJR9koiYsEHZpzq
ofE/c/mRFVLGLtyBkOJLxBSK7s17/IstYK2gjR3V9jUsGsOJ3G6Bf5unFx5ot7rE
UscuT6dkFw/5WDP2yMPcUlVOQFeOFZTxyxV2dRxqrrbtUWK5AkEA6Zidgo6qp86Q
NKkyzPlEO6YYCiw1QIkxxoSx3tNw6lUn0lGUvPjVKYVLpjcYAt2EzglEf8ZA6xDs
7cBmqqeyawJBAM2wd1XxGZ0QjITySI3cJCU7ihZwg6aahRT7fGXOh9wNDbseraYO
O9eSbDK7pDL4f3yhAkawLm03SosypAfPiPcCQHVJxbxp+dHr64gldHZqqhHxIZzp
+Yr/19g/hDfHnqhqPWZiw/XmUtFYNlWs0AeQRkBVculdF/dvNidiNap2LSUCQFcx
xYTzLg59I3SAWO16MwBtmv4kOEr6GgxpB7UItmM8TWPTf31zbz7VXXSsQtEwsqqc
fqCEs0mtNLaJgyukeMUCQFwBTqkcwX50T1kfkqBNBTT6yuc2o5igj6eunK4+zGBy
Tj9epuwuWkktAvq5CuYl8P5Coyfiu3AXbbOGzQLNIUY=
-----END RSA PRIVATE KEY-----
",
    "webhook_token" => "CJ757HL7nycK77bIcoh4GxTUn1m4t3LDl9mfwos2_AA",
  ),
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
