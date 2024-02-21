const fs = require('node:fs');

class User {
  constructor(id, name, email, password, secret) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.password = password;
    this.secret = secret;
  }


  save() {
    let user = {
      id: this.id,
      username: this.name,
      email: this.email,
      password: this.password,
      secret: this.secret,
    }
    let data = JSON.parse(fs.readFileSync('users.json'));
    data[this.name] = user;
    fs.writeFileSync('users.json', JSON.stringify(data, null, 4));
    return this;
  }
}
module.exports = { User };