var stringToHTML = function (str) {
	var dom = document.createElement('div');
  dom.innerHTML = str;

	return dom.firstChild;
};

var getAllComments = function(rootElem) {

  var comments = [];

  // Fourth argument, which is actually obsolete according to the DOM4 standard, is required in IE 11
  var iterator = document.createNodeIterator(rootElem, NodeFilter.SHOW_COMMENT, () => {
    return NodeFilter.FILTER_ACCEPT;
  }, false);

  var curNode;
  while (curNode = iterator.nextNode()) {
      comments.push(curNode);
  }
  return Promise.resolve(comments);
}

var cachedComponents = {};

var resolveComponentFromCache = function(component) {
  return new Promise((res, rej) => {
    if (cachedComponents[component]) {
      res(cachedComponents[component])
    } else {
      rej();
    }
  });
}

var updateComponentToCache = function(component, componentTemplate) {
  cachedComponents[component] = componentTemplate;
}

window.hydrateConfigurableNodes = function(dom, propObject) {
  return getAllComments(dom)
  .then(commentNodes => {
    return Promise.all(commentNodes.map((commentNode) => {
      var command = commentNode.nodeValue.trim();
      var commands = command.split(' ');

      if (commands.length && commands.length>1 && commands[0] === 'prop') {
        commentNode.parentNode.append(propObject[commands[1]]);
      }

      if (commands.length && commands.length>1 && commands[0] === 'fetch') {
        return window.resolveAndHydrateComponent(commands[1], propObject)
        .then((dom) => {
          commentNode.parentNode.appendChild(dom)
        })
      }
    }).filter((subCom) => !!subCom));
  })
}

window.resolveAndHydrateComponent = function(component, propObject) {
  return resolveComponentFromCache(component)
    .catch(() => fetch("components/"+component+".html")
      .then((res) => {
        if (res.status === 200) {
          const txt = res.text();
          updateComponentToCache(txt);
          return txt;
        } else {
          throw res;
        }
      }))
    .then((txt) => {
      const dom = stringToHTML(txt);
      return window.hydrateConfigurableNodes(dom, propObject)
      .then(() => dom);
    });
}