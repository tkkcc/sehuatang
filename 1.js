const fid = 36
const tag = ['handjobjapan', 'fellatiojapan', 'uralesbian', 'spermmania', 'legsjapan']
const doc = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta http-equiv="X-UA-Compatible" content="ie=edge" />
      <title>sehuatang</title>
      <style>
        :root {
          --color1: #444444;
          --color2: #fefefe;
        }
        body {
          color: var(--color1);
          text-align: center;
          margin: 0;
          box-sizing: border-box;
        }
        img {
          width: 100%;
        }
        ul {
          margin: 0;
          padding: 0;
          list-style-type: none;
        }
        li {
          color: var(--color1);
          margin: 0 11% 3em;
          padding: 0;
        }
        a {
          text-decoration: none;
        }
        .title {
          display: flex;
          justify-content: space-between;
          background-color: white;
        }
        #tag {
          margin: 1em 0;
        }
        #tag > span {
          display: inline-block;
          text-decoration: none;
          padding: 0.2em 0.8em;
          color: #444;
          cursor: pointer;
          user-select: none;
        }
        #tag > span.disable {
          color: #bbb;
        }
      </style>
    </head>
    <body>
      <div id="app">
        <div id="tag"></div>
        <ul></ul>
      </div>
    </body>
  </html>
`
document.documentElement.innerHTML = doc
const ul = document.querySelector('ul')
Array.prototype.last = function(i = 1) {
  return this[this.length - i]
}
const parseHTML = str => {
  const tmp = document.implementation.createHTMLDocument()
  tmp.body.innerHTML = str
  return tmp
}
// get one thread
const t0 = async tid => {
  const url = `https://www.sehuatang.org/forum.php?mod=viewthread&tid=${tid}`
  const cache = GM_getValue(tid)
  if (cache) return JSON.parse(cache)
  let a = await fetch(url)
  a = await a.text()
  a = parseHTML(a)
  a = {
    title: a.querySelector('#thread_subject').textContent,
    // time: a.querySelector('.authi > em').firstElementChild.textContent,
    img: a.querySelector('ignore_js_op > img').getAttribute('zoomfile'),
    magnet: a.querySelector('.blockcode li').textContent,
    torrent: a.querySelector('.attnm > a').href
  }
  GM_setValue(tid, JSON.stringify(a))
  return a
}
// get one page
const t1 = async (typeid, page) => {
  let a = await fetch(
    `https://www.sehuatang.org/forum.php?mod=forumdisplay&fid=${fid}&filter=typeid&typeid=${typeid}&page=${page}`
  )
  a = await a.text()
  a = parseHTML(a)
  // check page
  if (a.querySelector('#fd_page_top strong').textContent != page) return
  a = a.querySelectorAll('#threadlisttableid tr > th > em')
  a = [...a].map(i => ({
    type: i.firstElementChild.textContent,
    tid: /tid=(\d+)/.exec(i.nextElementSibling.href)[1],
    title: i.nextElementSibling.textContent
  }))
  return a.map(i => parseInt(i.tid))
}
// get type and id of one fid
const t2 = async () => {
  let a = await fetch(`https://www.sehuatang.org/forum.php?mod=forumdisplay&fid=${fid}`)
  a = await a.text()
  a = parseHTML(a)
  a = a.querySelectorAll('#thread_types > li:not([id]) > a')
  const b = {}
  ;[...a].forEach(i => (b[i.firstChild.textContent] = /typeid=(\d+)/.exec(i.href)[1]))
  return b
}
class C1 {
  constructor(typeid) {
    this.num_one_page = Number.MAX_SAFE_INTEGER
    this.data = JSON.parse(GM_getValue(typeid, '[]'))
    this.typeid = typeid
    this.i1 = 0
  }
  async get(page) {
    return await t1(this.typeid, page)
  }
  async more(a) {
    if (a.page === -1) return
    const aa = a.arr,
      aal = aa.last(),
      b = await this.get(++a.page)
    if (!b) return (a.page = -1)
    let i = 0
    for (; i < b.length && b[i] >= aal; ++i) {}
    if (i === b.length) await this.more(a)
    for (; i < b.length; ++i) aa.push(b[i])
  }
  merge() {
    const data = this.data
    if (data.length < 2) return
    const p = data.last(2),
      c = data.last(),
      pa = p.arr,
      ca = c.arr,
      cal = ca.last(),
      calen = ca.length
    if (cal > pa[0]) return
    let i = 1
    for (; i < pa.length && pa[i] >= cal; ++i) {}
    for (; i < pa.length; ++i) ca.push(pa[i])
    p.arr = ca
    if (p.page !== -1) p.page = (c.page + (ca.length - calen) / this.num_one_page) >> 0
    data.pop()
  }
  async refresh() {
    const data = this.data
    const p = data.last()
    data.push({
      arr: undefined,
      page: 0
    })
    const a = data.last()
    a.arr = await this.get(++a.page)
    this.num_one_page = a.arr.length
    this.merge()
    if (p === undefined || p.arr[0] != data.last().arr[0]) {
      this.save()
      return true
    }
  }
  async next() {
    const data = this.data
    if (data.length === 0) return await this.refresh()
    await this.more(data.last())
    this.merge()
    this.save()
  }
  save() {
    GM_setValue(this.typeid, JSON.stringify(this.data))
  }
  async nextOne() {
    if (this.data.length === 0) await this.refresh()
    const a = this.data.last().arr
    if (this.i1 < a.length) return a[this.i1++]
    await this.next()
    return a[this.i1++]
  }
}
const li = a => {
  const { title, img, magnet, torrent } = a
  return `
    <li>
      <img src="${img}" />
      <div class="title">
        <span>${title}</span>
        <span>
          <a href="${magnet}">magnet</a>
          <a href="${torrent}">torrent</a>
        </span>
      </div>
    </li>
  `
}

const clear = async () => {
  const cur = GM_info.script.version
  const pre = GM_getValue('version')
  if (pre != cur) {
    for (let key of GM_listValues()) GM_deleteValue(key)
    GM_setValue('version', cur)
    GM_setValue('tag', JSON.stringify(tag.slice(0, 3)))
    window.location.reload()
  }
}
const addTag = t => {
  const n = document.querySelector('#tag')
  const a = tag
    .map(i => `<span ${t.includes(i) ? '' : 'class=disable'}>${i}</span>`)
    .join('')
  requestAnimationFrame(() => (n.innerHTML = a))
  n.addEventListener('click', e => {
    e = e.target
    if (e.nodeName != 'SPAN') return
    e.classList.toggle('disable')
    if (e.classList.contains('disable')) {
      const i = t.indexOf(e.textContent)
      if (i !== -1) t.splice(i, 1)
    } else {
      t.push(e.textContent)
    }
    GM_setValue('tag', JSON.stringify(t))
    window.location.reload()
  })
}
const main = async () => {
  await clear()
  let t = GM_getValue('tag')
  t = t ? JSON.parse(t) : tag
  addTag(t)
  let tag2id = GM_getValue('tag2id')
  if (tag2id) tag2id = JSON.parse(tag2id)
  else {
    tag2id = await t2()
    GM_setValue('tag2id', JSON.stringify(tag2id))
  }
  const v = t.map(i => new C1(tag2id[i]))
  const q = await Promise.all(v.map(async i => await i.nextOne()))
  const next = async () => {
    let m = 0
    for (let i = 1; i < q.length; ++i) if (q[i] !== undefined && q[i] > q[m]) m = i
    if (q[m] === undefined) return
    const r = q[m]
    q[m] = await v[m].nextOne()
    return r
  }
  const add = async a => {
    if (a === undefined) {
      window.onscroll = null
      const num = ul.querySelectorAll('li').length
      ul.insertAdjacentHTML('afterend', `<span>total : ${num}</span>`)
      const total = document.querySelector('ul>span')
      new MutationObserver(
        () => (total.innerHTML = `total : ${ul.querySelectorAll('li').length}`)
      ).observe(ul, { childList: true })
      return
    }
    a = await t0(a)
    if (a === undefined) return
    requestAnimationFrame(() => ul.insertAdjacentHTML('beforeend', li(a)))
  }
  window.onscroll = async () => {
    if (3 * window.innerHeight + window.scrollY >= document.body.offsetHeight)
      add(await next())
  }
  for (let i = 0; i < 5; ++i) await add(await next())
  const a = await Promise.all(v.map(async i => await i.refresh()))
  if (a.some(i => i)) window.location.reload()
}
window.onbeforeunload = () => window.scrollTo(0, 0)
main()
