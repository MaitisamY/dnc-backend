import bcrypt from 'bcrypt'

const saltRounds = 10
const plainTextPassword = '123456'

const hash = bcrypt.hashSync(plainTextPassword, saltRounds)

console.log(hash)