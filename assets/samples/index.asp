<!-- #include file="include/utilities.asp" -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <title>
  <link href="/include/test.css" />
</head>
<body>
<div>
<%
Call Foo("bar")

Response.Cookies("foo")

%>

  <table>
  <div class="foo"></div>
  <script>
    function foo(bar) {

    }

    foo();
  </script>
</body>
</html>