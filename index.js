require('dotenv').config()

const express = require('express')
const app = express()
const port = 3000

const jsonData =[
    {
      "name": "Adeel Solangi",
      "language": "Sindhi",
      "id": "V59OF92YF627HFY0",
      "bio": "Donec lobortis eleifend condimentum. Cras dictum dolor lacinia lectus vehicula rutrum. Maecenas quis nisi nunc. Nam tristique feugiat est vitae mollis. Maecenas quis nisi nunc.",
      "version": 6.1
    },
    {
      "name": "Afzal Ghaffar",
      "language": "Sindhi",
      "id": "ENTOCR13RSCLZ6KU",
      "bio": "Aliquam sollicitudin ante ligula, eget malesuada nibh efficitur et. Pellentesque massa sem, scelerisque sit amet odio id, cursus tempor urna. Etiam congue dignissim volutpat. Vestibulum pharetra libero et velit gravida euismod.",
      "version": 1.88
    },
  ]

app.get('/', (req, res) => {
    res.send('Hello World!')
})
app.get('/twitter', (req, res) => {
    res.send("Welcome to Twitter")
})
app.get('/chai',(req,res)=>{
    res.send("<h1>Welcome to Chai Backend</h1>")
})
app.get('/json',(req,res)=>{
    res.json(jsonData)
})

app.listen(process.env.PORT, () => {
    console.log(`Example app listening on port ${port}`)
})