import fs from "fs"
import jsreportCore from "jsreport-core"
import handlebars from "jsreport-handlebars"
import chromePdf from "jsreport-chrome-pdf"

const jsreport = jsreportCore()

jsreport.use(handlebars())
jsreport.use(chromePdf())

await jsreport.init()

const result = await jsreport.render({
  template: {
    content: `
      <h1>Listado</h1>
      <ul>
        {{#each personas}}
          <li>{{nombre}} - {{dni}}</li>
        {{/each}}
      </ul>
    `,
    engine: "handlebars",
    recipe: "chrome-pdf"
  },
  data: {
    personas: [
      { nombre: "Juan", dni: "123" },
      { nombre: "Ana", dni: "456" }
    ]
  }
})

fs.writeFileSync("reporte.pdf", result.content)

await jsreport.close()