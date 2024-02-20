const users = [{
    "name": "fd",
    "email": "fd",
    "password": "fd",
    "secret": "GRGDKYLEHJUE6KLXJI3XURSMI4WFOMTU"
}];

class User {
  constructor(id, name, email, password, secret) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.password = password;
    this.secret = secret;
  }
}
module.exports = { users, User };