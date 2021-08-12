
addEventListener('fetch', event => {
  event.respondWith(fetchWithImageFix(event.request))
})

const cf = {
  cacheEverything: true,
  cacheTtl: 86400, // 1 day
  scrapeShield: false,
  mirage: true,
  polish: 'lossy',
}

async function fetchWithImageFix(request) {
  var url = new URL(request.url)
  if (url.pathname.startsWith('/_archive')) {
    return fetch(url.searchParams.get('url'), { cf })
  }

  return new HTMLRewriter()
    .on('img', new ImageFixer())
    .transform(await fetch(request))
}

class ImageFixer {
  // The `async` keyword enables async/await for this handler.
  async element(element) {
    var src = element.getAttribute('src')
    if (!src) {
      src = element.getAttribute('data-cfsrc')
      element.removeAttribute('data-cfsrc')
    }

    // Rewrite the URL with the fixed image.
    if (src) {
      element.setAttribute('src', await fixImageUrl(src))
    }
  }
}

async function fixImageUrl(url) {
  if (url.startsWith('/')) {
    return url
  }

  var response = await fetch(url.toString(), { method: 'HEAD', cf })
  if (response.ok || response.status === 405) {
    return response.url
  }

  var archive = await fetch(`https://archive.org/wayback/available?url=${url}`, { cf })
  try {
    var json = await archive.json()
    var archiveUrl = new URL(json.archived_snapshots.closest.url)
    var index = archiveUrl.pathname.indexOf('http')

    // Insert `im_` to archived URL so it renders as an image.
    archiveUrl.pathname =
      archiveUrl.pathname.substring(0, index - 1) +
      'im_' +
      archiveUrl.pathname.substring(index)
    console.log('Fixed image: ' + archiveUrl)

    return `/_archive?url=${archiveUrl}`
  } catch (err) {
    console.log('Missing image: ' + url)
    return response.url
  }
}

// import { handleEvent } from 'flareact'


// const DEBUG = false

// addEventListener('fetch', (event) => {
//   try {
//     event.respondWith(
//       handleEvent(event, require.context('./pages/', true, /\.(js|jsx|ts|tsx)$/), DEBUG)
//     )
//   } catch (e) {
//     if (DEBUG) {
//       return event.respondWith(
//         new Response(e.message || e.toString(), {
//           status: 500
//         })
//       )
//     }
//     event.respondWith(new Response('Internal Error', { status: 500 }))
//   }
// })
