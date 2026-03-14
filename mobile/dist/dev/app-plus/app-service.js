if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global2 = uni.requireGlobal();
  ArrayBuffer = global2.ArrayBuffer;
  Int8Array = global2.Int8Array;
  Uint8Array = global2.Uint8Array;
  Uint8ClampedArray = global2.Uint8ClampedArray;
  Int16Array = global2.Int16Array;
  Uint16Array = global2.Uint16Array;
  Int32Array = global2.Int32Array;
  Uint32Array = global2.Uint32Array;
  Float32Array = global2.Float32Array;
  Float64Array = global2.Float64Array;
  BigInt64Array = global2.BigInt64Array;
  BigUint64Array = global2.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  const ON_SHOW = "onShow";
  const ON_LAUNCH = "onLaunch";
  const ON_LOAD = "onLoad";
  const createLifeCycleHook = (lifecycle, flag = 0) => (hook, target = vue.getCurrentInstance()) => {
    !vue.isInSSRComponentSetup && vue.injectHook(lifecycle, hook, target);
  };
  const onShow = /* @__PURE__ */ createLifeCycleHook(
    ON_SHOW,
    1 | 2
    /* HookFlags.PAGE */
  );
  const onLaunch = /* @__PURE__ */ createLifeCycleHook(
    ON_LAUNCH,
    1
    /* HookFlags.APP */
  );
  const onLoad = /* @__PURE__ */ createLifeCycleHook(
    ON_LOAD,
    2
    /* HookFlags.PAGE */
  );
  function set(target, key, val) {
    if (Array.isArray(target)) {
      target.length = Math.max(target.length, key);
      target.splice(key, 1, val);
      return val;
    }
    target[key] = val;
    return val;
  }
  function del$1(target, key) {
    if (Array.isArray(target)) {
      target.splice(key, 1);
      return;
    }
    delete target[key];
  }
  function getDevtoolsGlobalHook() {
    return getTarget().__VUE_DEVTOOLS_GLOBAL_HOOK__;
  }
  function getTarget() {
    return typeof navigator !== "undefined" && typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : {};
  }
  const isProxyAvailable = typeof Proxy === "function";
  const HOOK_SETUP = "devtools-plugin:setup";
  const HOOK_PLUGIN_SETTINGS_SET = "plugin:settings:set";
  let supported;
  let perf;
  function isPerformanceSupported() {
    var _a;
    if (supported !== void 0) {
      return supported;
    }
    if (typeof window !== "undefined" && window.performance) {
      supported = true;
      perf = window.performance;
    } else if (typeof globalThis !== "undefined" && ((_a = globalThis.perf_hooks) === null || _a === void 0 ? void 0 : _a.performance)) {
      supported = true;
      perf = globalThis.perf_hooks.performance;
    } else {
      supported = false;
    }
    return supported;
  }
  function now() {
    return isPerformanceSupported() ? perf.now() : Date.now();
  }
  class ApiProxy {
    constructor(plugin, hook) {
      this.target = null;
      this.targetQueue = [];
      this.onQueue = [];
      this.plugin = plugin;
      this.hook = hook;
      const defaultSettings = {};
      if (plugin.settings) {
        for (const id in plugin.settings) {
          const item = plugin.settings[id];
          defaultSettings[id] = item.defaultValue;
        }
      }
      const localSettingsSaveId = `__vue-devtools-plugin-settings__${plugin.id}`;
      let currentSettings = Object.assign({}, defaultSettings);
      try {
        const raw = localStorage.getItem(localSettingsSaveId);
        const data = JSON.parse(raw);
        Object.assign(currentSettings, data);
      } catch (e) {
      }
      this.fallbacks = {
        getSettings() {
          return currentSettings;
        },
        setSettings(value) {
          try {
            localStorage.setItem(localSettingsSaveId, JSON.stringify(value));
          } catch (e) {
          }
          currentSettings = value;
        },
        now() {
          return now();
        }
      };
      if (hook) {
        hook.on(HOOK_PLUGIN_SETTINGS_SET, (pluginId, value) => {
          if (pluginId === this.plugin.id) {
            this.fallbacks.setSettings(value);
          }
        });
      }
      this.proxiedOn = new Proxy({}, {
        get: (_target, prop) => {
          if (this.target) {
            return this.target.on[prop];
          } else {
            return (...args) => {
              this.onQueue.push({
                method: prop,
                args
              });
            };
          }
        }
      });
      this.proxiedTarget = new Proxy({}, {
        get: (_target, prop) => {
          if (this.target) {
            return this.target[prop];
          } else if (prop === "on") {
            return this.proxiedOn;
          } else if (Object.keys(this.fallbacks).includes(prop)) {
            return (...args) => {
              this.targetQueue.push({
                method: prop,
                args,
                resolve: () => {
                }
              });
              return this.fallbacks[prop](...args);
            };
          } else {
            return (...args) => {
              return new Promise((resolve) => {
                this.targetQueue.push({
                  method: prop,
                  args,
                  resolve
                });
              });
            };
          }
        }
      });
    }
    async setRealTarget(target) {
      this.target = target;
      for (const item of this.onQueue) {
        this.target.on[item.method](...item.args);
      }
      for (const item of this.targetQueue) {
        item.resolve(await this.target[item.method](...item.args));
      }
    }
  }
  function setupDevtoolsPlugin(pluginDescriptor, setupFn) {
    const descriptor = pluginDescriptor;
    const target = getTarget();
    const hook = getDevtoolsGlobalHook();
    const enableProxy = isProxyAvailable && descriptor.enableEarlyProxy;
    if (hook && (target.__VUE_DEVTOOLS_PLUGIN_API_AVAILABLE__ || !enableProxy)) {
      hook.emit(HOOK_SETUP, pluginDescriptor, setupFn);
    } else {
      const proxy = enableProxy ? new ApiProxy(descriptor, hook) : null;
      const list = target.__VUE_DEVTOOLS_PLUGINS__ = target.__VUE_DEVTOOLS_PLUGINS__ || [];
      list.push({
        pluginDescriptor: descriptor,
        setupFn,
        proxy
      });
      if (proxy) {
        setupFn(proxy.proxiedTarget);
      }
    }
  }
  /*!
   * pinia v2.1.7
   * (c) 2023 Eduardo San Martin Morote
   * @license MIT
   */
  let activePinia;
  const setActivePinia = (pinia) => activePinia = pinia;
  const piniaSymbol = Symbol("pinia");
  function isPlainObject(o) {
    return o && typeof o === "object" && Object.prototype.toString.call(o) === "[object Object]" && typeof o.toJSON !== "function";
  }
  var MutationType;
  (function(MutationType2) {
    MutationType2["direct"] = "direct";
    MutationType2["patchObject"] = "patch object";
    MutationType2["patchFunction"] = "patch function";
  })(MutationType || (MutationType = {}));
  const IS_CLIENT = typeof window !== "undefined";
  const USE_DEVTOOLS = IS_CLIENT;
  const _global = /* @__PURE__ */ (() => typeof window === "object" && window.window === window ? window : typeof self === "object" && self.self === self ? self : typeof global === "object" && global.global === global ? global : typeof globalThis === "object" ? globalThis : { HTMLElement: null })();
  function bom(blob, { autoBom = false } = {}) {
    if (autoBom && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
      return new Blob([String.fromCharCode(65279), blob], { type: blob.type });
    }
    return blob;
  }
  function download(url, name, opts) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.onload = function() {
      saveAs(xhr.response, name, opts);
    };
    xhr.onerror = function() {
      console.error("could not download file");
    };
    xhr.send();
  }
  function corsEnabled(url) {
    const xhr = new XMLHttpRequest();
    xhr.open("HEAD", url, false);
    try {
      xhr.send();
    } catch (e) {
    }
    return xhr.status >= 200 && xhr.status <= 299;
  }
  function click(node) {
    try {
      node.dispatchEvent(new MouseEvent("click"));
    } catch (e) {
      const evt = document.createEvent("MouseEvents");
      evt.initMouseEvent("click", true, true, window, 0, 0, 0, 80, 20, false, false, false, false, 0, null);
      node.dispatchEvent(evt);
    }
  }
  const _navigator = typeof navigator === "object" ? navigator : { userAgent: "" };
  const isMacOSWebView = /* @__PURE__ */ (() => /Macintosh/.test(_navigator.userAgent) && /AppleWebKit/.test(_navigator.userAgent) && !/Safari/.test(_navigator.userAgent))();
  const saveAs = !IS_CLIENT ? () => {
  } : (
    // Use download attribute first if possible (#193 Lumia mobile) unless this is a macOS WebView or mini program
    typeof HTMLAnchorElement !== "undefined" && "download" in HTMLAnchorElement.prototype && !isMacOSWebView ? downloadSaveAs : (
      // Use msSaveOrOpenBlob as a second approach
      "msSaveOrOpenBlob" in _navigator ? msSaveAs : (
        // Fallback to using FileReader and a popup
        fileSaverSaveAs
      )
    )
  );
  function downloadSaveAs(blob, name = "download", opts) {
    const a = document.createElement("a");
    a.download = name;
    a.rel = "noopener";
    if (typeof blob === "string") {
      a.href = blob;
      if (a.origin !== location.origin) {
        if (corsEnabled(a.href)) {
          download(blob, name, opts);
        } else {
          a.target = "_blank";
          click(a);
        }
      } else {
        click(a);
      }
    } else {
      a.href = URL.createObjectURL(blob);
      setTimeout(function() {
        URL.revokeObjectURL(a.href);
      }, 4e4);
      setTimeout(function() {
        click(a);
      }, 0);
    }
  }
  function msSaveAs(blob, name = "download", opts) {
    if (typeof blob === "string") {
      if (corsEnabled(blob)) {
        download(blob, name, opts);
      } else {
        const a = document.createElement("a");
        a.href = blob;
        a.target = "_blank";
        setTimeout(function() {
          click(a);
        });
      }
    } else {
      navigator.msSaveOrOpenBlob(bom(blob, opts), name);
    }
  }
  function fileSaverSaveAs(blob, name, opts, popup) {
    popup = popup || open("", "_blank");
    if (popup) {
      popup.document.title = popup.document.body.innerText = "downloading...";
    }
    if (typeof blob === "string")
      return download(blob, name, opts);
    const force = blob.type === "application/octet-stream";
    const isSafari = /constructor/i.test(String(_global.HTMLElement)) || "safari" in _global;
    const isChromeIOS = /CriOS\/[\d]+/.test(navigator.userAgent);
    if ((isChromeIOS || force && isSafari || isMacOSWebView) && typeof FileReader !== "undefined") {
      const reader = new FileReader();
      reader.onloadend = function() {
        let url = reader.result;
        if (typeof url !== "string") {
          popup = null;
          throw new Error("Wrong reader.result type");
        }
        url = isChromeIOS ? url : url.replace(/^data:[^;]*;/, "data:attachment/file;");
        if (popup) {
          popup.location.href = url;
        } else {
          location.assign(url);
        }
        popup = null;
      };
      reader.readAsDataURL(blob);
    } else {
      const url = URL.createObjectURL(blob);
      if (popup)
        popup.location.assign(url);
      else
        location.href = url;
      popup = null;
      setTimeout(function() {
        URL.revokeObjectURL(url);
      }, 4e4);
    }
  }
  function toastMessage(message, type) {
    const piniaMessage = "🍍 " + message;
    if (typeof __VUE_DEVTOOLS_TOAST__ === "function") {
      __VUE_DEVTOOLS_TOAST__(piniaMessage, type);
    } else if (type === "error") {
      console.error(piniaMessage);
    } else if (type === "warn") {
      console.warn(piniaMessage);
    } else {
      console.log(piniaMessage);
    }
  }
  function isPinia(o) {
    return "_a" in o && "install" in o;
  }
  function checkClipboardAccess() {
    if (!("clipboard" in navigator)) {
      toastMessage(`Your browser doesn't support the Clipboard API`, "error");
      return true;
    }
  }
  function checkNotFocusedError(error) {
    if (error instanceof Error && error.message.toLowerCase().includes("document is not focused")) {
      toastMessage('You need to activate the "Emulate a focused page" setting in the "Rendering" panel of devtools.', "warn");
      return true;
    }
    return false;
  }
  async function actionGlobalCopyState(pinia) {
    if (checkClipboardAccess())
      return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(pinia.state.value));
      toastMessage("Global state copied to clipboard.");
    } catch (error) {
      if (checkNotFocusedError(error))
        return;
      toastMessage(`Failed to serialize the state. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  async function actionGlobalPasteState(pinia) {
    if (checkClipboardAccess())
      return;
    try {
      loadStoresState(pinia, JSON.parse(await navigator.clipboard.readText()));
      toastMessage("Global state pasted from clipboard.");
    } catch (error) {
      if (checkNotFocusedError(error))
        return;
      toastMessage(`Failed to deserialize the state from clipboard. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  async function actionGlobalSaveState(pinia) {
    try {
      saveAs(new Blob([JSON.stringify(pinia.state.value)], {
        type: "text/plain;charset=utf-8"
      }), "pinia-state.json");
    } catch (error) {
      toastMessage(`Failed to export the state as JSON. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  let fileInput;
  function getFileOpener() {
    if (!fileInput) {
      fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json";
    }
    function openFile() {
      return new Promise((resolve, reject) => {
        fileInput.onchange = async () => {
          const files = fileInput.files;
          if (!files)
            return resolve(null);
          const file = files.item(0);
          if (!file)
            return resolve(null);
          return resolve({ text: await file.text(), file });
        };
        fileInput.oncancel = () => resolve(null);
        fileInput.onerror = reject;
        fileInput.click();
      });
    }
    return openFile;
  }
  async function actionGlobalOpenStateFile(pinia) {
    try {
      const open2 = getFileOpener();
      const result = await open2();
      if (!result)
        return;
      const { text, file } = result;
      loadStoresState(pinia, JSON.parse(text));
      toastMessage(`Global state imported from "${file.name}".`);
    } catch (error) {
      toastMessage(`Failed to import the state from JSON. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  function loadStoresState(pinia, state) {
    for (const key in state) {
      const storeState = pinia.state.value[key];
      if (storeState) {
        Object.assign(storeState, state[key]);
      } else {
        pinia.state.value[key] = state[key];
      }
    }
  }
  function formatDisplay(display) {
    return {
      _custom: {
        display
      }
    };
  }
  const PINIA_ROOT_LABEL = "🍍 Pinia (root)";
  const PINIA_ROOT_ID = "_root";
  function formatStoreForInspectorTree(store) {
    return isPinia(store) ? {
      id: PINIA_ROOT_ID,
      label: PINIA_ROOT_LABEL
    } : {
      id: store.$id,
      label: store.$id
    };
  }
  function formatStoreForInspectorState(store) {
    if (isPinia(store)) {
      const storeNames = Array.from(store._s.keys());
      const storeMap = store._s;
      const state2 = {
        state: storeNames.map((storeId) => ({
          editable: true,
          key: storeId,
          value: store.state.value[storeId]
        })),
        getters: storeNames.filter((id) => storeMap.get(id)._getters).map((id) => {
          const store2 = storeMap.get(id);
          return {
            editable: false,
            key: id,
            value: store2._getters.reduce((getters, key) => {
              getters[key] = store2[key];
              return getters;
            }, {})
          };
        })
      };
      return state2;
    }
    const state = {
      state: Object.keys(store.$state).map((key) => ({
        editable: true,
        key,
        value: store.$state[key]
      }))
    };
    if (store._getters && store._getters.length) {
      state.getters = store._getters.map((getterName) => ({
        editable: false,
        key: getterName,
        value: store[getterName]
      }));
    }
    if (store._customProperties.size) {
      state.customProperties = Array.from(store._customProperties).map((key) => ({
        editable: true,
        key,
        value: store[key]
      }));
    }
    return state;
  }
  function formatEventData(events) {
    if (!events)
      return {};
    if (Array.isArray(events)) {
      return events.reduce((data, event) => {
        data.keys.push(event.key);
        data.operations.push(event.type);
        data.oldValue[event.key] = event.oldValue;
        data.newValue[event.key] = event.newValue;
        return data;
      }, {
        oldValue: {},
        keys: [],
        operations: [],
        newValue: {}
      });
    } else {
      return {
        operation: formatDisplay(events.type),
        key: formatDisplay(events.key),
        oldValue: events.oldValue,
        newValue: events.newValue
      };
    }
  }
  function formatMutationType(type) {
    switch (type) {
      case MutationType.direct:
        return "mutation";
      case MutationType.patchFunction:
        return "$patch";
      case MutationType.patchObject:
        return "$patch";
      default:
        return "unknown";
    }
  }
  let isTimelineActive = true;
  const componentStateTypes = [];
  const MUTATIONS_LAYER_ID = "pinia:mutations";
  const INSPECTOR_ID = "pinia";
  const { assign: assign$1 } = Object;
  const getStoreType = (id) => "🍍 " + id;
  function registerPiniaDevtools(app, pinia) {
    setupDevtoolsPlugin({
      id: "dev.esm.pinia",
      label: "Pinia 🍍",
      logo: "https://pinia.vuejs.org/logo.svg",
      packageName: "pinia",
      homepage: "https://pinia.vuejs.org",
      componentStateTypes,
      app
    }, (api) => {
      if (typeof api.now !== "function") {
        toastMessage("You seem to be using an outdated version of Vue Devtools. Are you still using the Beta release instead of the stable one? You can find the links at https://devtools.vuejs.org/guide/installation.html.");
      }
      api.addTimelineLayer({
        id: MUTATIONS_LAYER_ID,
        label: `Pinia 🍍`,
        color: 15064968
      });
      api.addInspector({
        id: INSPECTOR_ID,
        label: "Pinia 🍍",
        icon: "storage",
        treeFilterPlaceholder: "Search stores",
        actions: [
          {
            icon: "content_copy",
            action: () => {
              actionGlobalCopyState(pinia);
            },
            tooltip: "Serialize and copy the state"
          },
          {
            icon: "content_paste",
            action: async () => {
              await actionGlobalPasteState(pinia);
              api.sendInspectorTree(INSPECTOR_ID);
              api.sendInspectorState(INSPECTOR_ID);
            },
            tooltip: "Replace the state with the content of your clipboard"
          },
          {
            icon: "save",
            action: () => {
              actionGlobalSaveState(pinia);
            },
            tooltip: "Save the state as a JSON file"
          },
          {
            icon: "folder_open",
            action: async () => {
              await actionGlobalOpenStateFile(pinia);
              api.sendInspectorTree(INSPECTOR_ID);
              api.sendInspectorState(INSPECTOR_ID);
            },
            tooltip: "Import the state from a JSON file"
          }
        ],
        nodeActions: [
          {
            icon: "restore",
            tooltip: 'Reset the state (with "$reset")',
            action: (nodeId) => {
              const store = pinia._s.get(nodeId);
              if (!store) {
                toastMessage(`Cannot reset "${nodeId}" store because it wasn't found.`, "warn");
              } else if (typeof store.$reset !== "function") {
                toastMessage(`Cannot reset "${nodeId}" store because it doesn't have a "$reset" method implemented.`, "warn");
              } else {
                store.$reset();
                toastMessage(`Store "${nodeId}" reset.`);
              }
            }
          }
        ]
      });
      api.on.inspectComponent((payload, ctx) => {
        const proxy = payload.componentInstance && payload.componentInstance.proxy;
        if (proxy && proxy._pStores) {
          const piniaStores = payload.componentInstance.proxy._pStores;
          Object.values(piniaStores).forEach((store) => {
            payload.instanceData.state.push({
              type: getStoreType(store.$id),
              key: "state",
              editable: true,
              value: store._isOptionsAPI ? {
                _custom: {
                  value: vue.toRaw(store.$state),
                  actions: [
                    {
                      icon: "restore",
                      tooltip: "Reset the state of this store",
                      action: () => store.$reset()
                    }
                  ]
                }
              } : (
                // NOTE: workaround to unwrap transferred refs
                Object.keys(store.$state).reduce((state, key) => {
                  state[key] = store.$state[key];
                  return state;
                }, {})
              )
            });
            if (store._getters && store._getters.length) {
              payload.instanceData.state.push({
                type: getStoreType(store.$id),
                key: "getters",
                editable: false,
                value: store._getters.reduce((getters, key) => {
                  try {
                    getters[key] = store[key];
                  } catch (error) {
                    getters[key] = error;
                  }
                  return getters;
                }, {})
              });
            }
          });
        }
      });
      api.on.getInspectorTree((payload) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          let stores = [pinia];
          stores = stores.concat(Array.from(pinia._s.values()));
          payload.rootNodes = (payload.filter ? stores.filter((store) => "$id" in store ? store.$id.toLowerCase().includes(payload.filter.toLowerCase()) : PINIA_ROOT_LABEL.toLowerCase().includes(payload.filter.toLowerCase())) : stores).map(formatStoreForInspectorTree);
        }
      });
      api.on.getInspectorState((payload) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          const inspectedStore = payload.nodeId === PINIA_ROOT_ID ? pinia : pinia._s.get(payload.nodeId);
          if (!inspectedStore) {
            return;
          }
          if (inspectedStore) {
            payload.state = formatStoreForInspectorState(inspectedStore);
          }
        }
      });
      api.on.editInspectorState((payload, ctx) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          const inspectedStore = payload.nodeId === PINIA_ROOT_ID ? pinia : pinia._s.get(payload.nodeId);
          if (!inspectedStore) {
            return toastMessage(`store "${payload.nodeId}" not found`, "error");
          }
          const { path } = payload;
          if (!isPinia(inspectedStore)) {
            if (path.length !== 1 || !inspectedStore._customProperties.has(path[0]) || path[0] in inspectedStore.$state) {
              path.unshift("$state");
            }
          } else {
            path.unshift("state");
          }
          isTimelineActive = false;
          payload.set(inspectedStore, path, payload.state.value);
          isTimelineActive = true;
        }
      });
      api.on.editComponentState((payload) => {
        if (payload.type.startsWith("🍍")) {
          const storeId = payload.type.replace(/^🍍\s*/, "");
          const store = pinia._s.get(storeId);
          if (!store) {
            return toastMessage(`store "${storeId}" not found`, "error");
          }
          const { path } = payload;
          if (path[0] !== "state") {
            return toastMessage(`Invalid path for store "${storeId}":
${path}
Only state can be modified.`);
          }
          path[0] = "$state";
          isTimelineActive = false;
          payload.set(store, path, payload.state.value);
          isTimelineActive = true;
        }
      });
    });
  }
  function addStoreToDevtools(app, store) {
    if (!componentStateTypes.includes(getStoreType(store.$id))) {
      componentStateTypes.push(getStoreType(store.$id));
    }
    setupDevtoolsPlugin({
      id: "dev.esm.pinia",
      label: "Pinia 🍍",
      logo: "https://pinia.vuejs.org/logo.svg",
      packageName: "pinia",
      homepage: "https://pinia.vuejs.org",
      componentStateTypes,
      app,
      settings: {
        logStoreChanges: {
          label: "Notify about new/deleted stores",
          type: "boolean",
          defaultValue: true
        }
        // useEmojis: {
        //   label: 'Use emojis in messages ⚡️',
        //   type: 'boolean',
        //   defaultValue: true,
        // },
      }
    }, (api) => {
      const now2 = typeof api.now === "function" ? api.now.bind(api) : Date.now;
      store.$onAction(({ after, onError, name, args }) => {
        const groupId = runningActionId++;
        api.addTimelineEvent({
          layerId: MUTATIONS_LAYER_ID,
          event: {
            time: now2(),
            title: "🛫 " + name,
            subtitle: "start",
            data: {
              store: formatDisplay(store.$id),
              action: formatDisplay(name),
              args
            },
            groupId
          }
        });
        after((result) => {
          activeAction = void 0;
          api.addTimelineEvent({
            layerId: MUTATIONS_LAYER_ID,
            event: {
              time: now2(),
              title: "🛬 " + name,
              subtitle: "end",
              data: {
                store: formatDisplay(store.$id),
                action: formatDisplay(name),
                args,
                result
              },
              groupId
            }
          });
        });
        onError((error) => {
          activeAction = void 0;
          api.addTimelineEvent({
            layerId: MUTATIONS_LAYER_ID,
            event: {
              time: now2(),
              logType: "error",
              title: "💥 " + name,
              subtitle: "end",
              data: {
                store: formatDisplay(store.$id),
                action: formatDisplay(name),
                args,
                error
              },
              groupId
            }
          });
        });
      }, true);
      store._customProperties.forEach((name) => {
        vue.watch(() => vue.unref(store[name]), (newValue, oldValue) => {
          api.notifyComponentUpdate();
          api.sendInspectorState(INSPECTOR_ID);
          if (isTimelineActive) {
            api.addTimelineEvent({
              layerId: MUTATIONS_LAYER_ID,
              event: {
                time: now2(),
                title: "Change",
                subtitle: name,
                data: {
                  newValue,
                  oldValue
                },
                groupId: activeAction
              }
            });
          }
        }, { deep: true });
      });
      store.$subscribe(({ events, type }, state) => {
        api.notifyComponentUpdate();
        api.sendInspectorState(INSPECTOR_ID);
        if (!isTimelineActive)
          return;
        const eventData = {
          time: now2(),
          title: formatMutationType(type),
          data: assign$1({ store: formatDisplay(store.$id) }, formatEventData(events)),
          groupId: activeAction
        };
        if (type === MutationType.patchFunction) {
          eventData.subtitle = "⤵️";
        } else if (type === MutationType.patchObject) {
          eventData.subtitle = "🧩";
        } else if (events && !Array.isArray(events)) {
          eventData.subtitle = events.type;
        }
        if (events) {
          eventData.data["rawEvent(s)"] = {
            _custom: {
              display: "DebuggerEvent",
              type: "object",
              tooltip: "raw DebuggerEvent[]",
              value: events
            }
          };
        }
        api.addTimelineEvent({
          layerId: MUTATIONS_LAYER_ID,
          event: eventData
        });
      }, { detached: true, flush: "sync" });
      const hotUpdate = store._hotUpdate;
      store._hotUpdate = vue.markRaw((newStore) => {
        hotUpdate(newStore);
        api.addTimelineEvent({
          layerId: MUTATIONS_LAYER_ID,
          event: {
            time: now2(),
            title: "🔥 " + store.$id,
            subtitle: "HMR update",
            data: {
              store: formatDisplay(store.$id),
              info: formatDisplay(`HMR update`)
            }
          }
        });
        api.notifyComponentUpdate();
        api.sendInspectorTree(INSPECTOR_ID);
        api.sendInspectorState(INSPECTOR_ID);
      });
      const { $dispose } = store;
      store.$dispose = () => {
        $dispose();
        api.notifyComponentUpdate();
        api.sendInspectorTree(INSPECTOR_ID);
        api.sendInspectorState(INSPECTOR_ID);
        api.getSettings().logStoreChanges && toastMessage(`Disposed "${store.$id}" store 🗑`);
      };
      api.notifyComponentUpdate();
      api.sendInspectorTree(INSPECTOR_ID);
      api.sendInspectorState(INSPECTOR_ID);
      api.getSettings().logStoreChanges && toastMessage(`"${store.$id}" store installed 🆕`);
    });
  }
  let runningActionId = 0;
  let activeAction;
  function patchActionForGrouping(store, actionNames, wrapWithProxy) {
    const actions = actionNames.reduce((storeActions, actionName) => {
      storeActions[actionName] = vue.toRaw(store)[actionName];
      return storeActions;
    }, {});
    for (const actionName in actions) {
      store[actionName] = function() {
        const _actionId = runningActionId;
        const trackedStore = wrapWithProxy ? new Proxy(store, {
          get(...args) {
            activeAction = _actionId;
            return Reflect.get(...args);
          },
          set(...args) {
            activeAction = _actionId;
            return Reflect.set(...args);
          }
        }) : store;
        activeAction = _actionId;
        const retValue = actions[actionName].apply(trackedStore, arguments);
        activeAction = void 0;
        return retValue;
      };
    }
  }
  function devtoolsPlugin({ app, store, options }) {
    if (store.$id.startsWith("__hot:")) {
      return;
    }
    store._isOptionsAPI = !!options.state;
    patchActionForGrouping(store, Object.keys(options.actions), store._isOptionsAPI);
    const originalHotUpdate = store._hotUpdate;
    vue.toRaw(store)._hotUpdate = function(newStore) {
      originalHotUpdate.apply(this, arguments);
      patchActionForGrouping(store, Object.keys(newStore._hmrPayload.actions), !!store._isOptionsAPI);
    };
    addStoreToDevtools(
      app,
      // FIXME: is there a way to allow the assignment from Store<Id, S, G, A> to StoreGeneric?
      store
    );
  }
  function createPinia() {
    const scope = vue.effectScope(true);
    const state = scope.run(() => vue.ref({}));
    let _p = [];
    let toBeInstalled = [];
    const pinia = vue.markRaw({
      install(app) {
        setActivePinia(pinia);
        {
          pinia._a = app;
          app.provide(piniaSymbol, pinia);
          app.config.globalProperties.$pinia = pinia;
          if (USE_DEVTOOLS) {
            registerPiniaDevtools(app, pinia);
          }
          toBeInstalled.forEach((plugin) => _p.push(plugin));
          toBeInstalled = [];
        }
      },
      use(plugin) {
        if (!this._a && true) {
          toBeInstalled.push(plugin);
        } else {
          _p.push(plugin);
        }
        return this;
      },
      _p,
      // it's actually undefined here
      // @ts-expect-error
      _a: null,
      _e: scope,
      _s: /* @__PURE__ */ new Map(),
      state
    });
    if (USE_DEVTOOLS && typeof Proxy !== "undefined") {
      pinia.use(devtoolsPlugin);
    }
    return pinia;
  }
  function patchObject(newState, oldState) {
    for (const key in oldState) {
      const subPatch = oldState[key];
      if (!(key in newState)) {
        continue;
      }
      const targetValue = newState[key];
      if (isPlainObject(targetValue) && isPlainObject(subPatch) && !vue.isRef(subPatch) && !vue.isReactive(subPatch)) {
        newState[key] = patchObject(targetValue, subPatch);
      } else {
        {
          newState[key] = subPatch;
        }
      }
    }
    return newState;
  }
  const noop = () => {
  };
  function addSubscription(subscriptions, callback, detached, onCleanup = noop) {
    subscriptions.push(callback);
    const removeSubscription = () => {
      const idx = subscriptions.indexOf(callback);
      if (idx > -1) {
        subscriptions.splice(idx, 1);
        onCleanup();
      }
    };
    if (!detached && vue.getCurrentScope()) {
      vue.onScopeDispose(removeSubscription);
    }
    return removeSubscription;
  }
  function triggerSubscriptions(subscriptions, ...args) {
    subscriptions.slice().forEach((callback) => {
      callback(...args);
    });
  }
  const fallbackRunWithContext = (fn) => fn();
  function mergeReactiveObjects(target, patchToApply) {
    if (target instanceof Map && patchToApply instanceof Map) {
      patchToApply.forEach((value, key) => target.set(key, value));
    }
    if (target instanceof Set && patchToApply instanceof Set) {
      patchToApply.forEach(target.add, target);
    }
    for (const key in patchToApply) {
      if (!patchToApply.hasOwnProperty(key))
        continue;
      const subPatch = patchToApply[key];
      const targetValue = target[key];
      if (isPlainObject(targetValue) && isPlainObject(subPatch) && target.hasOwnProperty(key) && !vue.isRef(subPatch) && !vue.isReactive(subPatch)) {
        target[key] = mergeReactiveObjects(targetValue, subPatch);
      } else {
        target[key] = subPatch;
      }
    }
    return target;
  }
  const skipHydrateSymbol = Symbol("pinia:skipHydration");
  function shouldHydrate(obj) {
    return !isPlainObject(obj) || !obj.hasOwnProperty(skipHydrateSymbol);
  }
  const { assign } = Object;
  function isComputed(o) {
    return !!(vue.isRef(o) && o.effect);
  }
  function createOptionsStore(id, options, pinia, hot) {
    const { state, actions, getters } = options;
    const initialState = pinia.state.value[id];
    let store;
    function setup() {
      if (!initialState && !hot) {
        {
          pinia.state.value[id] = state ? state() : {};
        }
      }
      const localState = hot ? (
        // use ref() to unwrap refs inside state TODO: check if this is still necessary
        vue.toRefs(vue.ref(state ? state() : {}).value)
      ) : vue.toRefs(pinia.state.value[id]);
      return assign(localState, actions, Object.keys(getters || {}).reduce((computedGetters, name) => {
        if (name in localState) {
          console.warn(`[🍍]: A getter cannot have the same name as another state property. Rename one of them. Found with "${name}" in store "${id}".`);
        }
        computedGetters[name] = vue.markRaw(vue.computed(() => {
          setActivePinia(pinia);
          const store2 = pinia._s.get(id);
          return getters[name].call(store2, store2);
        }));
        return computedGetters;
      }, {}));
    }
    store = createSetupStore(id, setup, options, pinia, hot, true);
    return store;
  }
  function createSetupStore($id, setup, options = {}, pinia, hot, isOptionsStore) {
    let scope;
    const optionsForPlugin = assign({ actions: {} }, options);
    if (!pinia._e.active) {
      throw new Error("Pinia destroyed");
    }
    const $subscribeOptions = {
      deep: true
      // flush: 'post',
    };
    {
      $subscribeOptions.onTrigger = (event) => {
        if (isListening) {
          debuggerEvents = event;
        } else if (isListening == false && !store._hotUpdating) {
          if (Array.isArray(debuggerEvents)) {
            debuggerEvents.push(event);
          } else {
            console.error("🍍 debuggerEvents should be an array. This is most likely an internal Pinia bug.");
          }
        }
      };
    }
    let isListening;
    let isSyncListening;
    let subscriptions = [];
    let actionSubscriptions = [];
    let debuggerEvents;
    const initialState = pinia.state.value[$id];
    if (!isOptionsStore && !initialState && !hot) {
      {
        pinia.state.value[$id] = {};
      }
    }
    const hotState = vue.ref({});
    let activeListener;
    function $patch(partialStateOrMutator) {
      let subscriptionMutation;
      isListening = isSyncListening = false;
      {
        debuggerEvents = [];
      }
      if (typeof partialStateOrMutator === "function") {
        partialStateOrMutator(pinia.state.value[$id]);
        subscriptionMutation = {
          type: MutationType.patchFunction,
          storeId: $id,
          events: debuggerEvents
        };
      } else {
        mergeReactiveObjects(pinia.state.value[$id], partialStateOrMutator);
        subscriptionMutation = {
          type: MutationType.patchObject,
          payload: partialStateOrMutator,
          storeId: $id,
          events: debuggerEvents
        };
      }
      const myListenerId = activeListener = Symbol();
      vue.nextTick().then(() => {
        if (activeListener === myListenerId) {
          isListening = true;
        }
      });
      isSyncListening = true;
      triggerSubscriptions(subscriptions, subscriptionMutation, pinia.state.value[$id]);
    }
    const $reset = isOptionsStore ? function $reset2() {
      const { state } = options;
      const newState = state ? state() : {};
      this.$patch(($state) => {
        assign($state, newState);
      });
    } : (
      /* istanbul ignore next */
      () => {
        throw new Error(`🍍: Store "${$id}" is built using the setup syntax and does not implement $reset().`);
      }
    );
    function $dispose() {
      scope.stop();
      subscriptions = [];
      actionSubscriptions = [];
      pinia._s.delete($id);
    }
    function wrapAction(name, action) {
      return function() {
        setActivePinia(pinia);
        const args = Array.from(arguments);
        const afterCallbackList = [];
        const onErrorCallbackList = [];
        function after(callback) {
          afterCallbackList.push(callback);
        }
        function onError(callback) {
          onErrorCallbackList.push(callback);
        }
        triggerSubscriptions(actionSubscriptions, {
          args,
          name,
          store,
          after,
          onError
        });
        let ret;
        try {
          ret = action.apply(this && this.$id === $id ? this : store, args);
        } catch (error) {
          triggerSubscriptions(onErrorCallbackList, error);
          throw error;
        }
        if (ret instanceof Promise) {
          return ret.then((value) => {
            triggerSubscriptions(afterCallbackList, value);
            return value;
          }).catch((error) => {
            triggerSubscriptions(onErrorCallbackList, error);
            return Promise.reject(error);
          });
        }
        triggerSubscriptions(afterCallbackList, ret);
        return ret;
      };
    }
    const _hmrPayload = /* @__PURE__ */ vue.markRaw({
      actions: {},
      getters: {},
      state: [],
      hotState
    });
    const partialStore = {
      _p: pinia,
      // _s: scope,
      $id,
      $onAction: addSubscription.bind(null, actionSubscriptions),
      $patch,
      $reset,
      $subscribe(callback, options2 = {}) {
        const removeSubscription = addSubscription(subscriptions, callback, options2.detached, () => stopWatcher());
        const stopWatcher = scope.run(() => vue.watch(() => pinia.state.value[$id], (state) => {
          if (options2.flush === "sync" ? isSyncListening : isListening) {
            callback({
              storeId: $id,
              type: MutationType.direct,
              events: debuggerEvents
            }, state);
          }
        }, assign({}, $subscribeOptions, options2)));
        return removeSubscription;
      },
      $dispose
    };
    const store = vue.reactive(assign(
      {
        _hmrPayload,
        _customProperties: vue.markRaw(/* @__PURE__ */ new Set())
        // devtools custom properties
      },
      partialStore
      // must be added later
      // setupStore
    ));
    pinia._s.set($id, store);
    const runWithContext = pinia._a && pinia._a.runWithContext || fallbackRunWithContext;
    const setupStore = runWithContext(() => pinia._e.run(() => (scope = vue.effectScope()).run(setup)));
    for (const key in setupStore) {
      const prop = setupStore[key];
      if (vue.isRef(prop) && !isComputed(prop) || vue.isReactive(prop)) {
        if (hot) {
          set(hotState.value, key, vue.toRef(setupStore, key));
        } else if (!isOptionsStore) {
          if (initialState && shouldHydrate(prop)) {
            if (vue.isRef(prop)) {
              prop.value = initialState[key];
            } else {
              mergeReactiveObjects(prop, initialState[key]);
            }
          }
          {
            pinia.state.value[$id][key] = prop;
          }
        }
        {
          _hmrPayload.state.push(key);
        }
      } else if (typeof prop === "function") {
        const actionValue = hot ? prop : wrapAction(key, prop);
        {
          setupStore[key] = actionValue;
        }
        {
          _hmrPayload.actions[key] = prop;
        }
        optionsForPlugin.actions[key] = prop;
      } else {
        if (isComputed(prop)) {
          _hmrPayload.getters[key] = isOptionsStore ? (
            // @ts-expect-error
            options.getters[key]
          ) : prop;
          if (IS_CLIENT) {
            const getters = setupStore._getters || // @ts-expect-error: same
            (setupStore._getters = vue.markRaw([]));
            getters.push(key);
          }
        }
      }
    }
    {
      assign(store, setupStore);
      assign(vue.toRaw(store), setupStore);
    }
    Object.defineProperty(store, "$state", {
      get: () => hot ? hotState.value : pinia.state.value[$id],
      set: (state) => {
        if (hot) {
          throw new Error("cannot set hotState");
        }
        $patch(($state) => {
          assign($state, state);
        });
      }
    });
    {
      store._hotUpdate = vue.markRaw((newStore) => {
        store._hotUpdating = true;
        newStore._hmrPayload.state.forEach((stateKey) => {
          if (stateKey in store.$state) {
            const newStateTarget = newStore.$state[stateKey];
            const oldStateSource = store.$state[stateKey];
            if (typeof newStateTarget === "object" && isPlainObject(newStateTarget) && isPlainObject(oldStateSource)) {
              patchObject(newStateTarget, oldStateSource);
            } else {
              newStore.$state[stateKey] = oldStateSource;
            }
          }
          set(store, stateKey, vue.toRef(newStore.$state, stateKey));
        });
        Object.keys(store.$state).forEach((stateKey) => {
          if (!(stateKey in newStore.$state)) {
            del$1(store, stateKey);
          }
        });
        isListening = false;
        isSyncListening = false;
        pinia.state.value[$id] = vue.toRef(newStore._hmrPayload, "hotState");
        isSyncListening = true;
        vue.nextTick().then(() => {
          isListening = true;
        });
        for (const actionName in newStore._hmrPayload.actions) {
          const action = newStore[actionName];
          set(store, actionName, wrapAction(actionName, action));
        }
        for (const getterName in newStore._hmrPayload.getters) {
          const getter = newStore._hmrPayload.getters[getterName];
          const getterValue = isOptionsStore ? (
            // special handling of options api
            vue.computed(() => {
              setActivePinia(pinia);
              return getter.call(store, store);
            })
          ) : getter;
          set(store, getterName, getterValue);
        }
        Object.keys(store._hmrPayload.getters).forEach((key) => {
          if (!(key in newStore._hmrPayload.getters)) {
            del$1(store, key);
          }
        });
        Object.keys(store._hmrPayload.actions).forEach((key) => {
          if (!(key in newStore._hmrPayload.actions)) {
            del$1(store, key);
          }
        });
        store._hmrPayload = newStore._hmrPayload;
        store._getters = newStore._getters;
        store._hotUpdating = false;
      });
    }
    if (USE_DEVTOOLS) {
      const nonEnumerable = {
        writable: true,
        configurable: true,
        // avoid warning on devtools trying to display this property
        enumerable: false
      };
      ["_p", "_hmrPayload", "_getters", "_customProperties"].forEach((p) => {
        Object.defineProperty(store, p, assign({ value: store[p] }, nonEnumerable));
      });
    }
    pinia._p.forEach((extender) => {
      if (USE_DEVTOOLS) {
        const extensions = scope.run(() => extender({
          store,
          app: pinia._a,
          pinia,
          options: optionsForPlugin
        }));
        Object.keys(extensions || {}).forEach((key) => store._customProperties.add(key));
        assign(store, extensions);
      } else {
        assign(store, scope.run(() => extender({
          store,
          app: pinia._a,
          pinia,
          options: optionsForPlugin
        })));
      }
    });
    if (store.$state && typeof store.$state === "object" && typeof store.$state.constructor === "function" && !store.$state.constructor.toString().includes("[native code]")) {
      console.warn(`[🍍]: The "state" must be a plain object. It cannot be
	state: () => new MyClass()
Found in store "${store.$id}".`);
    }
    if (initialState && isOptionsStore && options.hydrate) {
      options.hydrate(store.$state, initialState);
    }
    isListening = true;
    isSyncListening = true;
    return store;
  }
  function defineStore(idOrOptions, setup, setupOptions) {
    let id;
    let options;
    const isSetupStore = typeof setup === "function";
    if (typeof idOrOptions === "string") {
      id = idOrOptions;
      options = isSetupStore ? setupOptions : setup;
    } else {
      options = idOrOptions;
      id = idOrOptions.id;
      if (typeof id !== "string") {
        throw new Error(`[🍍]: "defineStore()" must be passed a store id as its first argument.`);
      }
    }
    function useStore(pinia, hot) {
      const hasContext = vue.hasInjectionContext();
      pinia = // in test mode, ignore the argument provided as we can always retrieve a
      // pinia instance with getActivePinia()
      pinia || (hasContext ? vue.inject(piniaSymbol, null) : null);
      if (pinia)
        setActivePinia(pinia);
      if (!activePinia) {
        throw new Error(`[🍍]: "getActivePinia()" was called but there was no active Pinia. Are you trying to use a store before calling "app.use(pinia)"?
See https://pinia.vuejs.org/core-concepts/outside-component-usage.html for help.
This will fail in production.`);
      }
      pinia = activePinia;
      if (!pinia._s.has(id)) {
        if (isSetupStore) {
          createSetupStore(id, setup, options, pinia);
        } else {
          createOptionsStore(id, options, pinia);
        }
        {
          useStore._pinia = pinia;
        }
      }
      const store = pinia._s.get(id);
      if (hot) {
        const hotId = "__hot:" + id;
        const newStore = isSetupStore ? createSetupStore(hotId, setup, options, pinia, true) : createOptionsStore(hotId, assign({}, options), pinia, true);
        hot._hotUpdate(newStore);
        delete pinia.state.value[hotId];
        pinia._s.delete(hotId);
      }
      if (IS_CLIENT) {
        const currentInstance = vue.getCurrentInstance();
        if (currentInstance && currentInstance.proxy && // avoid adding stores that are just built for hot module replacement
        !hot) {
          const vm = currentInstance.proxy;
          const cache = "_pStores" in vm ? vm._pStores : vm._pStores = {};
          cache[id] = store;
        }
      }
      return store;
    }
    useStore.$id = id;
    return useStore;
  }
  const DEFAULT_BASE_URL = "http://192.168.1.44:3000/api/v1";
  function getBaseUrl() {
    return uni.getStorageSync("api_base_url") || DEFAULT_BASE_URL;
  }
  function getTokenFromStorage() {
    return uni.getStorageSync("token") || "";
  }
  function handleUnauthorized() {
    uni.removeStorageSync("token");
    uni.removeStorageSync("userInfo");
    uni.redirectTo({ url: "/pages/login/index" });
  }
  function isHttpSuccess(statusCode) {
    return Number(statusCode) >= 200 && Number(statusCode) < 300;
  }
  function normalizeResponseData(res) {
    if (res && typeof res.data === "object" && res.data !== null) {
      return res.data;
    }
    const success = isHttpSuccess(res == null ? void 0 : res.statusCode);
    return {
      success,
      code: Number((res == null ? void 0 : res.statusCode) || 500),
      message: success ? "操作成功" : "请求失败",
      data: (res == null ? void 0 : res.data) ?? null
    };
  }
  function request(options) {
    return new Promise((resolve, reject) => {
      const token = getTokenFromStorage();
      const baseUrl = getBaseUrl();
      const requestUrl = baseUrl + options.url;
      const requestMethod = options.method || "GET";
      uni.request({
        url: requestUrl,
        method: requestMethod,
        data: options.data,
        header: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        success: (res) => {
          const responseData = normalizeResponseData(res);
          if (isHttpSuccess(res.statusCode)) {
            if (responseData.success || isHttpSuccess(responseData.code)) {
              resolve(responseData);
            } else {
              uni.showToast({ title: responseData.message || "请求失败", icon: "none" });
              resolve(responseData);
            }
            return;
          }
          if (res.statusCode === 401) {
            handleUnauthorized();
            reject(new Error("未授权"));
            return;
          }
          const errorMessage = responseData.message || `请求失败(${res.statusCode})`;
          uni.showToast({ title: errorMessage, icon: "none" });
          reject(new Error(errorMessage));
        },
        fail: (err) => {
          uni.showToast({ title: "网络错误", icon: "none" });
          reject(err);
        }
      });
    });
  }
  function get(url, data) {
    return request({ url, method: "GET", data });
  }
  function post(url, data) {
    return request({ url, method: "POST", data });
  }
  function put(url, data) {
    return request({ url, method: "PUT", data });
  }
  function del(url, data) {
    return request({ url, method: "DELETE", data });
  }
  function getBanners() {
    return get("/banners");
  }
  function login(data) {
    return post("/user/login", data);
  }
  function miniappSilentLogin(data) {
    return post("/user/miniapp/silent-login", data);
  }
  function getProfile() {
    return get("/user/profile");
  }
  function getHomeData() {
    return get("/user/home");
  }
  function syncPushDevice(data) {
    return post("/user/push-device", data);
  }
  function getLoans(params) {
    return get("/loans", params);
  }
  function getLoanDetail(id) {
    return get(`/loans/${id}`);
  }
  function getLoanSchedule(id) {
    return get(`/loans/${id}/schedule`);
  }
  function createLoan(data) {
    return post("/loans", data);
  }
  function updateLoan(id, data) {
    return put(`/loans/${id}`, data);
  }
  function deleteLoan(id) {
    return del(`/loans/${id}`);
  }
  function createDefaultHomeData() {
    return {
      monthlyAmount: 0,
      loanCount: 0,
      nextRepayment: null,
      hasLoan: false
    };
  }
  function getPersistedToken() {
    return uni.getStorageSync("token") || "";
  }
  const useHomeStore = defineStore("home", () => {
    const banners = vue.ref([]);
    const loanList = vue.ref([]);
    const homeData = vue.ref(createDefaultHomeData());
    const loading = vue.ref(false);
    const latestLoadSerial = vue.ref(0);
    const refreshSignal = vue.ref(0);
    const refreshReason = vue.ref("");
    const hasLoans = vue.computed(() => homeData.value.hasLoan || loanList.value.length > 0);
    function resetLoanData() {
      loanList.value = [];
      homeData.value = createDefaultHomeData();
    }
    function requestRefresh(reason = "unknown") {
      refreshSignal.value = Date.now();
      refreshReason.value = reason;
    }
    function applyHomeData(apiData = {}) {
      homeData.value = {
        monthlyAmount: apiData.monthlyAmount || 0,
        loanCount: apiData.loanCount || 0,
        nextRepayment: apiData.nextRepayment || null,
        hasLoan: Boolean(apiData.hasLoan)
      };
    }
    async function loadBanners() {
      try {
        const res = await getBanners();
        if (res.success) {
          banners.value = res.data || [];
        }
      } catch (error) {
      }
    }
    async function loadHomeSummary() {
      const persistedToken = getPersistedToken();
      if (!persistedToken) {
        applyHomeData();
        return;
      }
      const res = await getHomeData();
      if (res.success) {
        applyHomeData(res.data);
      }
    }
    async function loadLoanList() {
      const persistedToken = getPersistedToken();
      if (!persistedToken) {
        loanList.value = [];
        return;
      }
      const res = await getLoans({ status: 1 });
      if (res.success) {
        loanList.value = res.data || [];
      }
    }
    async function loadDashboard(trigger = "unknown") {
      getPersistedToken();
      const loadSerial = Date.now();
      latestLoadSerial.value = loadSerial;
      loading.value = true;
      try {
        await loadBanners();
        if (!getPersistedToken()) {
          resetLoanData();
          return;
        }
        await Promise.all([loadHomeSummary(), loadLoanList()]);
      } catch (error) {
      } finally {
        if (latestLoadSerial.value === loadSerial) {
          loading.value = false;
        }
      }
    }
    return {
      banners,
      loanList,
      homeData,
      loading,
      hasLoans,
      refreshSignal,
      refreshReason,
      resetLoanData,
      requestRefresh,
      loadDashboard
    };
  });
  const USER_LOGIN_SUCCESS_EVENT = "user:login-success";
  const USER_LOGOUT_EVENT = "user:logout";
  const useUserStore = defineStore("user", () => {
    const token = vue.ref(uni.getStorageSync("token") || "");
    const userInfo = vue.ref(uni.getStorageSync("userInfo") || null);
    const isLoggedIn = vue.computed(() => !!token.value);
    function persistLogin(payload) {
      token.value = payload.token;
      userInfo.value = payload.user;
      uni.setStorageSync("token", payload.token);
      uni.setStorageSync("userInfo", payload.user);
    }
    function checkLogin() {
      if (token.value) {
        getProfile().catch(() => {
          logout();
        });
      }
    }
    async function login$1(phone, platform = "miniapp", extra = {}) {
      var _a;
      const res = await login({ phone, platform, ...extra });
      if (res.success) {
        persistLogin(res.data);
        uni.$emit(USER_LOGIN_SUCCESS_EVENT, {
          source: "phoneLogin",
          user: ((_a = res.data) == null ? void 0 : _a.user) || null
        });
      }
      return res;
    }
    async function silentLoginByMiniappOpenid() {
      return new Promise((resolve) => {
        uni.login({
          success: async (loginRes) => {
            var _a, _b, _c;
            if (!loginRes.code) {
              logout();
              resolve(false);
              return;
            }
            try {
              const res = await miniappSilentLogin({ code: loginRes.code });
              if (res.success && ((_a = res.data) == null ? void 0 : _a.bound) && ((_b = res.data) == null ? void 0 : _b.token)) {
                persistLogin(res.data);
                uni.$emit(USER_LOGIN_SUCCESS_EVENT, {
                  source: "silentLogin",
                  user: ((_c = res.data) == null ? void 0 : _c.user) || null
                });
                resolve(true);
                return;
              }
            } catch (error) {
            }
            logout();
            resolve(false);
          },
          fail: () => {
            logout();
            resolve(false);
          }
        });
      });
    }
    function logout() {
      token.value = "";
      userInfo.value = null;
      uni.removeStorageSync("token");
      uni.removeStorageSync("userInfo");
      uni.$emit(USER_LOGOUT_EVENT);
    }
    function updateUser(info) {
      userInfo.value = { ...userInfo.value || {}, ...info };
      uni.setStorageSync("userInfo", userInfo.value);
    }
    return {
      token,
      userInfo,
      isLoggedIn,
      checkLogin,
      login: login$1,
      silentLoginByMiniappOpenid,
      logout,
      updateUser
    };
  });
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$7 = {
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const userStore = useUserStore();
      const homeStore = useHomeStore();
      const authLoading = vue.ref(false);
      const loadingText = vue.ref("首页加载中...");
      const banners = vue.computed(() => homeStore.banners);
      const loanList = vue.computed(() => homeStore.loanList);
      const homeData = vue.computed(() => homeStore.homeData);
      const pageLoading = vue.computed(() => homeStore.loading || authLoading.value);
      const hasLoans = vue.computed(() => homeStore.hasLoans);
      const currentMonth = vue.computed(() => {
        const now2 = /* @__PURE__ */ new Date();
        return `${now2.getFullYear()}年${now2.getMonth() + 1}月`;
      });
      const getPersistedToken2 = () => uni.getStorageSync("token") || "";
      const formatMoney = (val) => Number(val || 0).toFixed(2);
      const refreshPage = async (trigger = "unknown") => {
        try {
          uni.showNavigationBarLoading();
          loadingText.value = "首页数据加载中...";
          await homeStore.loadDashboard(trigger);
        } finally {
          uni.hideNavigationBarLoading();
        }
      };
      const onBannerClick = (item) => {
        if (!item.link_url) {
          return;
        }
        uni.navigateTo({
          url: `/pages/webview/index?url=${encodeURIComponent(item.link_url)}`
        });
      };
      const goAddLoan = () => uni.navigateTo({ url: "/pages/loan/add/index" });
      const goLoanDetail = (id) => uni.navigateTo({ url: `/pages/loan/edit/index?id=${id}` });
      const goLoanSchedule = (id) => uni.navigateTo({ url: `/pages/loan/schedule/index?id=${id}` });
      const ensureLoginThenRefresh = async (trigger = "unknown") => {
        const persistedToken = getPersistedToken2();
        if (persistedToken) {
          await refreshPage(`${trigger}:hasToken`);
          return;
        }
        uni.reLaunch({
          url: "/pages/login/index"
        });
      };
      vue.onMounted(() => {
        ensureLoginThenRefresh("onMounted");
      });
      onShow(() => {
        ensureLoginThenRefresh("onShow");
      });
      const __returned__ = { userStore, homeStore, authLoading, loadingText, banners, loanList, homeData, pageLoading, hasLoans, currentMonth, getPersistedToken: getPersistedToken2, formatMoney, refreshPage, onBannerClick, goAddLoan, goLoanDetail, goLoanSchedule, ensureLoginThenRefresh, ref: vue.ref, computed: vue.computed, onMounted: vue.onMounted, get onShow() {
        return onShow;
      }, get useHomeStore() {
        return useHomeStore;
      }, get useUserStore() {
        return useUserStore;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$6(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "home-page" }, [
      vue.createElementVNode("swiper", {
        class: "banner-swiper",
        "indicator-dots": true,
        autoplay: true,
        interval: 4e3,
        circular: true,
        "indicator-color": "rgba(255,255,255,0.6)",
        "indicator-active-color": "#ff4d3a"
      }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.banners, (item) => {
            return vue.openBlock(), vue.createElementBlock("swiper-item", {
              key: item.id
            }, [
              vue.createElementVNode("image", {
                class: "banner-image",
                src: item.image_url,
                mode: "aspectFill",
                onClick: ($event) => $setup.onBannerClick(item)
              }, null, 8, ["src", "onClick"])
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      vue.createElementVNode("view", { class: "repayment-card" }, [
        vue.createElementVNode("view", { class: "card-header" }, [
          vue.createElementVNode("text", { class: "card-title" }, "我的还款动态"),
          vue.createElementVNode(
            "text",
            { class: "card-date" },
            vue.toDisplayString($setup.currentMonth),
            1
            /* TEXT */
          )
        ]),
        $setup.hasLoans ? (vue.openBlock(), vue.createElementBlock(
          vue.Fragment,
          { key: 0 },
          [
            vue.createElementVNode("view", { class: "main-info" }, [
              vue.createElementVNode("view", { class: "amount-block" }, [
                vue.createElementVNode("text", { class: "summary-label" }, "本月待还"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  "¥" + vue.toDisplayString($setup.formatMoney($setup.homeData.monthlyAmount)),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "days-block" }, [
                vue.createElementVNode("text", { class: "summary-label" }, "最近还款"),
                vue.createElementVNode("view", { class: "days-value" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "days" },
                    vue.toDisplayString($setup.homeData.nextRepayment ? $setup.homeData.nextRepayment.daysRemaining : "--"),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("text", { class: "unit" }, "天后到期")
                ])
              ])
            ]),
            $setup.homeData.nextRepayment ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "next-info"
            }, [
              vue.createElementVNode("text", { class: "next-label" }, "下一笔："),
              vue.createElementVNode(
                "text",
                { class: "next-name" },
                vue.toDisplayString($setup.homeData.nextRepayment.loanName),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "next-amount" },
                "¥" + vue.toDisplayString($setup.formatMoney($setup.homeData.nextRepayment.amount)),
                1
                /* TEXT */
              )
            ])) : vue.createCommentVNode("v-if", true)
          ],
          64
          /* STABLE_FRAGMENT */
        )) : (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "empty-state"
        }, [
          vue.createElementVNode("text", { class: "empty-text" }, "暂无贷款记录"),
          vue.createElementVNode("button", {
            class: "add-btn",
            onClick: $setup.goAddLoan
          }, "立即新增")
        ]))
      ]),
      vue.createElementVNode("view", { class: "loan-section" }, [
        vue.createElementVNode("view", { class: "section-header" }, [
          vue.createElementVNode("text", { class: "section-title" }, "还款计划"),
          vue.createElementVNode("button", {
            class: "section-add-btn",
            onClick: $setup.goAddLoan
          }, "新增还款")
        ]),
        $setup.loanList.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "loan-list"
        }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($setup.loanList, (loan) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: loan.id,
                class: "loan-card"
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "loan-name" },
                  vue.toDisplayString(loan.loan_name),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("view", { class: "info-row" }, [
                  vue.createElementVNode("text", { class: "label" }, "本月付款金额"),
                  vue.createElementVNode(
                    "text",
                    { class: "value value-accent" },
                    "¥" + vue.toDisplayString($setup.formatMoney(loan.current_payment_amount)),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "info-row" }, [
                  vue.createElementVNode("text", { class: "label" }, "贷款总额"),
                  vue.createElementVNode(
                    "text",
                    { class: "value" },
                    "¥" + vue.toDisplayString($setup.formatMoney(loan.principal)),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "info-row" }, [
                  vue.createElementVNode("text", { class: "label" }, "剩余还款金额"),
                  vue.createElementVNode(
                    "text",
                    { class: "value" },
                    "¥" + vue.toDisplayString($setup.formatMoney(loan.remaining_amount)),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "info-row" }, [
                  vue.createElementVNode("text", { class: "label" }, "还款提醒"),
                  vue.createElementVNode(
                    "text",
                    { class: "value" },
                    vue.toDisplayString(loan.remind_time_text),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "info-row" }, [
                  vue.createElementVNode("text", { class: "label" }, "还款方式"),
                  vue.createElementVNode(
                    "text",
                    { class: "value" },
                    vue.toDisplayString(loan.repayment_method_label),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "info-row" }, [
                  vue.createElementVNode("text", { class: "label" }, "首期支付日期"),
                  vue.createElementVNode(
                    "text",
                    { class: "value" },
                    vue.toDisplayString(loan.first_payment),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "action-row" }, [
                  vue.createElementVNode("button", {
                    class: "btn btn-primary",
                    onClick: ($event) => $setup.goLoanDetail(loan.id)
                  }, "编辑", 8, ["onClick"]),
                  vue.createElementVNode("button", {
                    class: "btn btn-outline",
                    onClick: ($event) => $setup.goLoanSchedule(loan.id)
                  }, "还款明细", 8, ["onClick"])
                ])
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "empty-wrap"
        }, [
          vue.createElementVNode("text", { class: "empty-tip" }, "暂无还款计划，点击右上角新增还款")
        ])),
        $setup.loanList.length > 0 ? (vue.openBlock(), vue.createElementBlock("text", {
          key: 2,
          class: "footer-tip"
        }, "已全部加载完毕")) : vue.createCommentVNode("v-if", true)
      ]),
      $setup.pageLoading ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "page-loading-mask"
      }, [
        vue.createElementVNode("view", { class: "loading-panel" }, [
          vue.createElementVNode("view", { class: "loading-spinner" }),
          vue.createElementVNode(
            "text",
            { class: "loading-text" },
            vue.toDisplayString($setup.loadingText),
            1
            /* TEXT */
          )
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$6], ["__scopeId", "data-v-83a5a03c"], ["__file", "/Users/wangjun/Documents/GitHub/金融APP/mobile/src/pages/index/index.vue"]]);
  const REPAYMENT_METHODS = {
    EQUAL_INSTALLMENT: "equal_installment",
    EQUAL_PRINCIPAL: "equal_principal",
    INTEREST_FIRST: "interest_first"
  };
  const REPAYMENT_METHOD_LABELS = {
    [REPAYMENT_METHODS.EQUAL_INSTALLMENT]: "等额本息",
    [REPAYMENT_METHODS.EQUAL_PRINCIPAL]: "等额本金",
    [REPAYMENT_METHODS.INTEREST_FIRST]: "先息后本"
  };
  function round2(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }
  function calcMonthlyRate(annualRate) {
    return Number(annualRate || 0) / 100 / 12;
  }
  function normalizeRepaymentMethod(method) {
    const values = Object.values(REPAYMENT_METHODS);
    return values.includes(method) ? method : REPAYMENT_METHODS.EQUAL_INSTALLMENT;
  }
  function calculateSchedule(options) {
    const principal = round2(options.principal || 0);
    const annualRate = Number(options.annualRate || 0);
    const termMonths = Math.max(1, parseInt(options.termMonths || 1));
    const repaymentMethod = normalizeRepaymentMethod(options.repaymentMethod);
    const monthlyRate = calcMonthlyRate(annualRate);
    const schedule = [];
    let balance = principal;
    let fixedInstallment = 0;
    let fixedPrincipal = 0;
    if (repaymentMethod === REPAYMENT_METHODS.EQUAL_INSTALLMENT) {
      if (monthlyRate === 0) {
        fixedInstallment = principal / termMonths;
      } else {
        const power = Math.pow(1 + monthlyRate, termMonths);
        fixedInstallment = principal * monthlyRate * power / (power - 1);
      }
    }
    if (repaymentMethod === REPAYMENT_METHODS.EQUAL_PRINCIPAL) {
      fixedPrincipal = principal / termMonths;
    }
    for (let i = 1; i <= termMonths; i++) {
      let interest = round2(balance * monthlyRate);
      let principalPart = 0;
      let payment = 0;
      if (repaymentMethod === REPAYMENT_METHODS.EQUAL_INSTALLMENT) {
        payment = round2(fixedInstallment);
        principalPart = round2(payment - interest);
        if (i === termMonths) {
          principalPart = round2(balance);
          payment = round2(principalPart + interest);
        }
      } else if (repaymentMethod === REPAYMENT_METHODS.EQUAL_PRINCIPAL) {
        principalPart = round2(fixedPrincipal);
        if (i === termMonths) {
          principalPart = round2(balance);
        }
        payment = round2(principalPart + interest);
      } else {
        if (i === termMonths) {
          principalPart = round2(balance);
          payment = round2(principalPart + interest);
        } else {
          principalPart = 0;
          payment = round2(interest);
        }
      }
      balance = round2(balance - principalPart);
      if (i === termMonths || balance < 0.01) {
        balance = 0;
      }
      schedule.push({
        period: i,
        payment,
        principal: principalPart,
        interest,
        balance
      });
    }
    return schedule;
  }
  function getTotalInterest(schedule = []) {
    return round2(schedule.reduce((sum, item) => sum + Number(item.interest || 0), 0));
  }
  const _sfc_main$6 = {
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const form = vue.reactive({
        loan_name: "",
        principal: "",
        annual_rate: "",
        term_months: "",
        repayment_method: REPAYMENT_METHODS.EQUAL_INSTALLMENT,
        first_payment: "",
        remind_enabled: true,
        remind_day: 1,
        remind_hour: 12,
        remind_minute: 0
      });
      const showReminderPicker = vue.ref(false);
      const showFirstPaymentPicker = vue.ref(false);
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      const years = Array.from({ length: 31 }, (_, i) => currentYear - 10 + i);
      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      const days = Array.from({ length: 31 }, (_, i) => i + 1);
      const hours = Array.from({ length: 24 }, (_, i) => i);
      const minutes = Array.from({ length: 60 }, (_, i) => i);
      const firstPaymentPickerValue = vue.ref([10, 0]);
      const remindPickerValue = vue.ref([0, 12, 0]);
      const methodLabel = vue.computed(() => REPAYMENT_METHOD_LABELS[form.repayment_method]);
      const monthlyRateText = vue.computed(() => {
        const rate = calcMonthlyRate(form.annual_rate) * 100;
        return `${Number.isFinite(rate) ? rate.toFixed(2) : "0.00"}%`;
      });
      const monthlyPaymentText = vue.computed(() => {
        var _a, _b;
        if (!isFormCalculable())
          return "0";
        const schedule = calculateSchedule({
          principal: Number(form.principal),
          annualRate: Number(form.annual_rate),
          termMonths: Number(form.term_months),
          repaymentMethod: form.repayment_method
        });
        return ((_b = (_a = schedule[0]) == null ? void 0 : _a.payment) == null ? void 0 : _b.toFixed(2)) || "0";
      });
      const remindTimeText = vue.computed(() => `每月${form.remind_day}日 ${pad2(form.remind_hour)}:${pad2(form.remind_minute)}`);
      function isFormCalculable() {
        return Number(form.principal) > 0 && Number(form.term_months) > 0 && Number(form.annual_rate) >= 0;
      }
      function pad2(value) {
        return String(value).padStart(2, "0");
      }
      function noop2() {
      }
      function goSchedule() {
        if (!isFormCalculable()) {
          uni.showToast({ title: "请先填写完整金额、利率和期限", icon: "none" });
          return;
        }
        if (!form.first_payment) {
          uni.showToast({ title: "请先选择首期支付日期", icon: "none" });
          return;
        }
        const query = [
          "mode=preview",
          `principal=${encodeURIComponent(Number(form.principal))}`,
          `annual_rate=${encodeURIComponent(Number(form.annual_rate))}`,
          `term_months=${encodeURIComponent(Number(form.term_months))}`,
          `repayment_method=${encodeURIComponent(normalizeRepaymentMethod(form.repayment_method))}`,
          `first_payment=${encodeURIComponent(form.first_payment)}`
        ].join("&");
        uni.navigateTo({ url: `/pages/loan/schedule/index?${query}` });
      }
      function chooseRepaymentMethod() {
        const methods = [
          REPAYMENT_METHODS.EQUAL_INSTALLMENT,
          REPAYMENT_METHODS.EQUAL_PRINCIPAL,
          REPAYMENT_METHODS.INTEREST_FIRST
        ];
        uni.showActionSheet({
          itemList: methods.map((item) => REPAYMENT_METHOD_LABELS[item]),
          success: ({ tapIndex }) => {
            form.repayment_method = methods[tapIndex];
          }
        });
      }
      function buildFirstPaymentPickerValue() {
        if (form.first_payment) {
          const [yearText, monthText] = form.first_payment.split("/");
          const yearIndex = years.findIndex((year) => year === Number(yearText));
          const monthIndex = months.findIndex((month) => month === Number(monthText));
          return [yearIndex >= 0 ? yearIndex : 10, monthIndex >= 0 ? monthIndex : 0];
        }
        const now2 = /* @__PURE__ */ new Date();
        const defaultYearIndex = years.findIndex((year) => year === now2.getFullYear());
        return [defaultYearIndex >= 0 ? defaultYearIndex : 10, now2.getMonth()];
      }
      function openFirstPaymentPicker() {
        firstPaymentPickerValue.value = buildFirstPaymentPickerValue();
        showFirstPaymentPicker.value = true;
      }
      function closeFirstPaymentPicker() {
        showFirstPaymentPicker.value = false;
      }
      function onFirstPaymentPickerChange(event) {
        firstPaymentPickerValue.value = event.detail.value;
      }
      function confirmFirstPaymentPicker() {
        const year = years[firstPaymentPickerValue.value[0]];
        const month = months[firstPaymentPickerValue.value[1]];
        form.first_payment = `${year}/${month}`;
        closeFirstPaymentPicker();
      }
      function onRemindCardClick() {
        if (!form.remind_enabled)
          return;
        openReminderPicker();
      }
      function onRemindToggle(event) {
        form.remind_enabled = !!event.detail.value;
        if (form.remind_enabled) {
          openReminderPicker();
        }
      }
      function openReminderPicker() {
        remindPickerValue.value = [form.remind_day - 1, form.remind_hour, form.remind_minute];
        showReminderPicker.value = true;
      }
      function closeReminderPicker() {
        showReminderPicker.value = false;
      }
      function onRemindPickerChange(event) {
        remindPickerValue.value = event.detail.value;
      }
      function confirmReminderPicker() {
        form.remind_day = days[remindPickerValue.value[0]];
        form.remind_hour = hours[remindPickerValue.value[1]];
        form.remind_minute = minutes[remindPickerValue.value[2]];
        closeReminderPicker();
      }
      async function submitForm() {
        if (!form.loan_name.trim()) {
          uni.showToast({ title: "请输入贷款名称", icon: "none" });
          return;
        }
        if (!(Number(form.principal) > 0)) {
          uni.showToast({ title: "请输入正确的贷款总额", icon: "none" });
          return;
        }
        if (!(Number(form.annual_rate) >= 0 && Number(form.annual_rate) <= 100)) {
          uni.showToast({ title: "请输入0-100内的年利率", icon: "none" });
          return;
        }
        if (!(Number(form.term_months) >= 1 && Number(form.term_months) <= 360)) {
          uni.showToast({ title: "请输入1-360的贷款期限", icon: "none" });
          return;
        }
        if (!form.first_payment) {
          uni.showToast({ title: "请选择首期支付日期", icon: "none" });
          return;
        }
        const payload = {
          loan_name: form.loan_name.trim(),
          principal: Number(form.principal),
          annual_rate: Number(form.annual_rate),
          term_months: Number(form.term_months),
          repayment_method: normalizeRepaymentMethod(form.repayment_method),
          first_payment: form.first_payment,
          remind_enabled: form.remind_enabled ? 1 : 0,
          remind_day: form.remind_day,
          remind_hour: form.remind_hour,
          remind_minute: form.remind_minute
        };
        const res = await createLoan(payload);
        if (res.success) {
          uni.showToast({ title: "新增成功", icon: "success" });
          setTimeout(() => uni.navigateBack(), 400);
        }
      }
      const __returned__ = { form, showReminderPicker, showFirstPaymentPicker, currentYear, years, months, days, hours, minutes, firstPaymentPickerValue, remindPickerValue, methodLabel, monthlyRateText, monthlyPaymentText, remindTimeText, isFormCalculable, pad2, noop: noop2, goSchedule, chooseRepaymentMethod, buildFirstPaymentPickerValue, openFirstPaymentPicker, closeFirstPaymentPicker, onFirstPaymentPickerChange, confirmFirstPaymentPicker, onRemindCardClick, onRemindToggle, openReminderPicker, closeReminderPicker, onRemindPickerChange, confirmReminderPicker, submitForm, computed: vue.computed, reactive: vue.reactive, ref: vue.ref, get createLoan() {
        return createLoan;
      }, get REPAYMENT_METHOD_LABELS() {
        return REPAYMENT_METHOD_LABELS;
      }, get REPAYMENT_METHODS() {
        return REPAYMENT_METHODS;
      }, get calculateSchedule() {
        return calculateSchedule;
      }, get calcMonthlyRate() {
        return calcMonthlyRate;
      }, get normalizeRepaymentMethod() {
        return normalizeRepaymentMethod;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createElementVNode("scroll-view", {
        "scroll-y": "",
        class: "content"
      }, [
        vue.createElementVNode("view", { class: "section-card single-line" }, [
          vue.createElementVNode("text", { class: "item-label" }, "贷款名称"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.form.loan_name = $event),
              class: "item-input",
              maxlength: "100",
              placeholder: "请输入贷款名称",
              "placeholder-class": "placeholder"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.loan_name]
          ])
        ]),
        vue.createElementVNode("view", { class: "section-card" }, [
          vue.createElementVNode("view", { class: "item-row" }, [
            vue.createElementVNode("text", { class: "item-label" }, "贷款总额(元)"),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.form.principal = $event),
                class: "item-input",
                type: "digit",
                placeholder: "请输入8位数内的整数",
                "placeholder-class": "placeholder"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $setup.form.principal]
            ])
          ]),
          vue.createElementVNode("view", { class: "item-row" }, [
            vue.createElementVNode("view", null, [
              vue.createElementVNode("text", { class: "item-label" }, "贷款年利率(%)"),
              vue.createElementVNode(
                "text",
                { class: "item-sub" },
                "贷款月利率" + vue.toDisplayString($setup.monthlyRateText),
                1
                /* TEXT */
              )
            ]),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $setup.form.annual_rate = $event),
                class: "item-input",
                type: "digit",
                placeholder: "请输入100内的数字",
                "placeholder-class": "placeholder"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $setup.form.annual_rate]
            ])
          ]),
          vue.createElementVNode("view", { class: "item-row" }, [
            vue.createElementVNode("text", { class: "item-label" }, "贷款期限(月)"),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.form.term_months = $event),
                class: "item-input",
                type: "number",
                placeholder: "请输入1-360的整数",
                "placeholder-class": "placeholder"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $setup.form.term_months]
            ])
          ]),
          vue.createElementVNode("view", {
            class: "item-row clickable",
            onClick: $setup.chooseRepaymentMethod
          }, [
            vue.createElementVNode("text", { class: "item-label" }, "还款方式"),
            vue.createElementVNode("view", { class: "item-value-wrap" }, [
              vue.createElementVNode(
                "text",
                { class: "item-value" },
                vue.toDisplayString($setup.methodLabel),
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", { class: "arrow" }, "›")
            ])
          ]),
          vue.createElementVNode("view", {
            class: "item-row clickable",
            onClick: $setup.openFirstPaymentPicker
          }, [
            vue.createElementVNode("text", { class: "item-label" }, "首期支付"),
            vue.createElementVNode("view", { class: "item-value-wrap" }, [
              vue.createElementVNode(
                "text",
                {
                  class: vue.normalizeClass(["item-value muted", { "is-selected": !!$setup.form.first_payment }])
                },
                vue.toDisplayString($setup.form.first_payment || "请选择首期支付日期"),
                3
                /* TEXT, CLASS */
              ),
              vue.createElementVNode("text", { class: "arrow" }, "›")
            ])
          ]),
          vue.createElementVNode("view", {
            class: "item-row clickable",
            onClick: $setup.goSchedule
          }, [
            vue.createElementVNode("view", null, [
              vue.createElementVNode("text", { class: "item-label item-accent" }, "本月付款金额"),
              vue.createElementVNode(
                "text",
                { class: "payment-amount" },
                "¥" + vue.toDisplayString($setup.monthlyPaymentText),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("text", { class: "arrow" }, "›")
          ])
        ]),
        vue.createElementVNode("view", {
          class: "section-card remind-card",
          onClick: $setup.onRemindCardClick
        }, [
          vue.createElementVNode("view", null, [
            vue.createElementVNode("text", { class: "item-label" }, "还款提醒"),
            $setup.form.remind_enabled ? (vue.openBlock(), vue.createElementBlock(
              "text",
              {
                key: 0,
                class: "item-sub"
              },
              vue.toDisplayString($setup.remindTimeText),
              1
              /* TEXT */
            )) : vue.createCommentVNode("v-if", true)
          ]),
          vue.createElementVNode("switch", {
            checked: $setup.form.remind_enabled,
            color: "#ff4d3a",
            onChange: $setup.onRemindToggle,
            onClick: vue.withModifiers($setup.noop, ["stop"])
          }, null, 40, ["checked"])
        ]),
        vue.createElementVNode("button", {
          class: "submit-btn",
          onClick: $setup.submitForm
        }, "提交新增")
      ]),
      $setup.showFirstPaymentPicker ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "picker-mask",
        onClick: $setup.closeFirstPaymentPicker
      }, [
        vue.createElementVNode("view", {
          class: "picker-panel",
          onClick: vue.withModifiers($setup.noop, ["stop"])
        }, [
          vue.createElementVNode("view", { class: "picker-header" }, [
            vue.createElementVNode("text", {
              class: "header-btn cancel",
              onClick: $setup.closeFirstPaymentPicker
            }, "取消"),
            vue.createElementVNode("text", { class: "header-title" }, "首期支付"),
            vue.createElementVNode("text", {
              class: "header-btn confirm",
              onClick: $setup.confirmFirstPaymentPicker
            }, "确定")
          ]),
          vue.createElementVNode("picker-view", {
            value: $setup.firstPaymentPickerValue,
            class: "picker-view",
            onChange: $setup.onFirstPaymentPickerChange
          }, [
            vue.createElementVNode("picker-view-column", null, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($setup.years, (item) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: `y-${item}`,
                      class: "picker-item"
                    },
                    vue.toDisplayString(item) + "年",
                    1
                    /* TEXT */
                  );
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            vue.createElementVNode("picker-view-column", null, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($setup.months, (item) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: `mo-${item}`,
                      class: "picker-item"
                    },
                    vue.toDisplayString(item) + "月",
                    1
                    /* TEXT */
                  );
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ], 40, ["value"])
        ])
      ])) : vue.createCommentVNode("v-if", true),
      $setup.showReminderPicker ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "picker-mask",
        onClick: $setup.closeReminderPicker
      }, [
        vue.createElementVNode("view", {
          class: "picker-panel",
          onClick: vue.withModifiers($setup.noop, ["stop"])
        }, [
          vue.createElementVNode("view", { class: "picker-header" }, [
            vue.createElementVNode("text", {
              class: "header-btn cancel",
              onClick: $setup.closeReminderPicker
            }, "取消"),
            vue.createElementVNode("text", { class: "header-title" }, "每月提醒"),
            vue.createElementVNode("text", {
              class: "header-btn confirm",
              onClick: $setup.confirmReminderPicker
            }, "确定")
          ]),
          vue.createElementVNode("picker-view", {
            value: $setup.remindPickerValue,
            class: "picker-view",
            onChange: $setup.onRemindPickerChange
          }, [
            vue.createElementVNode("picker-view-column", null, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($setup.days, (item) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: `d-${item}`,
                      class: "picker-item"
                    },
                    vue.toDisplayString(item) + "日",
                    1
                    /* TEXT */
                  );
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            vue.createElementVNode("picker-view-column", null, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($setup.hours, (item) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: `h-${item}`,
                      class: "picker-item"
                    },
                    vue.toDisplayString($setup.pad2(item)),
                    1
                    /* TEXT */
                  );
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            vue.createElementVNode("picker-view-column", null, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($setup.minutes, (item) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: `m-${item}`,
                      class: "picker-item"
                    },
                    vue.toDisplayString($setup.pad2(item)),
                    1
                    /* TEXT */
                  );
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ], 40, ["value"])
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const PagesLoanAddIndex = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$5], ["__scopeId", "data-v-7fe15a7a"], ["__file", "/Users/wangjun/Documents/GitHub/金融APP/mobile/src/pages/loan/add/index.vue"]]);
  const _sfc_main$5 = {
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const loanId = vue.ref("");
      const loaded = vue.ref(false);
      const showReminderPicker = vue.ref(false);
      const showFirstPaymentPicker = vue.ref(false);
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      const years = Array.from({ length: 31 }, (_, i) => currentYear - 10 + i);
      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      const form = vue.reactive({
        loan_name: "",
        principal: "",
        annual_rate: "",
        term_months: "",
        repayment_method: REPAYMENT_METHODS.EQUAL_INSTALLMENT,
        first_payment: "",
        remind_enabled: true,
        remind_day: 1,
        remind_hour: 12,
        remind_minute: 0
      });
      const days = Array.from({ length: 31 }, (_, i) => i + 1);
      const hours = Array.from({ length: 24 }, (_, i) => i);
      const minutes = Array.from({ length: 60 }, (_, i) => i);
      const firstPaymentPickerValue = vue.ref([10, 0]);
      const remindPickerValue = vue.ref([0, 12, 0]);
      const methodLabel = vue.computed(() => REPAYMENT_METHOD_LABELS[form.repayment_method]);
      const monthlyRateText = vue.computed(() => {
        const rate = calcMonthlyRate(form.annual_rate) * 100;
        return `${Number.isFinite(rate) ? rate.toFixed(2) : "0.00"}%`;
      });
      const monthlyPaymentText = vue.computed(() => {
        var _a, _b;
        if (!(Number(form.principal) > 0 && Number(form.term_months) > 0))
          return "0.00";
        const schedule = calculateSchedule({
          principal: Number(form.principal),
          annualRate: Number(form.annual_rate),
          termMonths: Number(form.term_months),
          repaymentMethod: form.repayment_method
        });
        return ((_b = (_a = schedule[0]) == null ? void 0 : _a.payment) == null ? void 0 : _b.toFixed(2)) || "0.00";
      });
      const remindTimeText = vue.computed(() => {
        if (!form.remind_enabled)
          return "已关闭";
        return `每月${form.remind_day}日 ${pad2(form.remind_hour)}:${pad2(form.remind_minute)}`;
      });
      function pad2(value) {
        return String(value).padStart(2, "0");
      }
      function noop2() {
      }
      function goSchedule() {
        if (loanId.value) {
          uni.navigateTo({ url: `/pages/loan/schedule/index?id=${loanId.value}` });
          return;
        }
        if (!(Number(form.principal) > 0 && Number(form.term_months) > 0)) {
          uni.showToast({ title: "请先填写完整金额、利率和期限", icon: "none" });
          return;
        }
        if (!form.first_payment) {
          uni.showToast({ title: "请先选择首期支付日期", icon: "none" });
          return;
        }
        const query = [
          "mode=preview",
          `principal=${encodeURIComponent(Number(form.principal))}`,
          `annual_rate=${encodeURIComponent(Number(form.annual_rate))}`,
          `term_months=${encodeURIComponent(Number(form.term_months))}`,
          `repayment_method=${encodeURIComponent(normalizeRepaymentMethod(form.repayment_method))}`,
          `first_payment=${encodeURIComponent(form.first_payment)}`
        ].join("&");
        uni.navigateTo({ url: `/pages/loan/schedule/index?${query}` });
      }
      async function loadDetail() {
        const res = await getLoanDetail(loanId.value);
        if (res.success) {
          const data = res.data;
          form.loan_name = data.loan_name || "";
          form.principal = String(data.principal || "");
          form.annual_rate = String(data.annual_rate || "");
          form.term_months = String(data.term_months || "");
          form.repayment_method = normalizeRepaymentMethod(data.repayment_method);
          form.first_payment = data.first_payment || "";
          form.remind_enabled = !!data.remind_enabled;
          form.remind_day = Number(data.remind_day || 1);
          form.remind_hour = Number(data.remind_hour || 12);
          form.remind_minute = Number(data.remind_minute || 0);
          loaded.value = true;
        }
      }
      function chooseRepaymentMethod() {
        const methods = [
          REPAYMENT_METHODS.EQUAL_INSTALLMENT,
          REPAYMENT_METHODS.EQUAL_PRINCIPAL,
          REPAYMENT_METHODS.INTEREST_FIRST
        ];
        uni.showActionSheet({
          itemList: methods.map((item) => REPAYMENT_METHOD_LABELS[item]),
          success: ({ tapIndex }) => {
            form.repayment_method = methods[tapIndex];
          }
        });
      }
      function buildFirstPaymentPickerValue() {
        if (form.first_payment) {
          const [yearText, monthText] = form.first_payment.split("/");
          const yearIndex = years.findIndex((year) => year === Number(yearText));
          const monthIndex = months.findIndex((month) => month === Number(monthText));
          return [yearIndex >= 0 ? yearIndex : 10, monthIndex >= 0 ? monthIndex : 0];
        }
        const now2 = /* @__PURE__ */ new Date();
        const defaultYearIndex = years.findIndex((year) => year === now2.getFullYear());
        return [defaultYearIndex >= 0 ? defaultYearIndex : 10, now2.getMonth()];
      }
      function openFirstPaymentPicker() {
        firstPaymentPickerValue.value = buildFirstPaymentPickerValue();
        showFirstPaymentPicker.value = true;
      }
      function closeFirstPaymentPicker() {
        showFirstPaymentPicker.value = false;
      }
      function onFirstPaymentPickerChange(event) {
        firstPaymentPickerValue.value = event.detail.value;
      }
      function confirmFirstPaymentPicker() {
        const year = years[firstPaymentPickerValue.value[0]];
        const month = months[firstPaymentPickerValue.value[1]];
        form.first_payment = `${year}/${month}`;
        closeFirstPaymentPicker();
      }
      function onRemindCardClick() {
        if (!form.remind_enabled)
          return;
        openReminderPicker();
      }
      function onRemindToggle(event) {
        form.remind_enabled = !!event.detail.value;
        if (form.remind_enabled) {
          openReminderPicker();
        }
      }
      function openReminderPicker() {
        remindPickerValue.value = [form.remind_day - 1, form.remind_hour, form.remind_minute];
        showReminderPicker.value = true;
      }
      function closeReminderPicker() {
        showReminderPicker.value = false;
      }
      function onRemindPickerChange(event) {
        remindPickerValue.value = event.detail.value;
      }
      function confirmReminderPicker() {
        form.remind_day = days[remindPickerValue.value[0]];
        form.remind_hour = hours[remindPickerValue.value[1]];
        form.remind_minute = minutes[remindPickerValue.value[2]];
        closeReminderPicker();
      }
      async function submitUpdate() {
        if (!form.loan_name.trim()) {
          uni.showToast({ title: "请输入贷款名称", icon: "none" });
          return;
        }
        const payload = {
          loan_name: form.loan_name.trim(),
          principal: Number(form.principal),
          annual_rate: Number(form.annual_rate),
          term_months: Number(form.term_months),
          repayment_method: normalizeRepaymentMethod(form.repayment_method),
          first_payment: form.first_payment,
          remind_enabled: form.remind_enabled ? 1 : 0,
          remind_day: form.remind_day,
          remind_hour: form.remind_hour,
          remind_minute: form.remind_minute
        };
        const res = await updateLoan(loanId.value, payload);
        if (res.success) {
          uni.showToast({ title: "修改成功", icon: "success" });
          setTimeout(() => uni.navigateBack(), 400);
        }
      }
      function confirmDelete() {
        uni.showModal({
          title: "删除确认",
          content: "确定删除该还款计划吗？删除后不可恢复。",
          confirmColor: "#ff4d3a",
          success: async ({ confirm }) => {
            if (!confirm)
              return;
            const res = await deleteLoan(loanId.value);
            if (res.success) {
              uni.showToast({ title: "删除成功", icon: "success" });
              setTimeout(() => uni.navigateBack(), 400);
            }
          }
        });
      }
      onLoad((options) => {
        loanId.value = options.id || "";
        loadDetail();
      });
      const __returned__ = { loanId, loaded, showReminderPicker, showFirstPaymentPicker, currentYear, years, months, form, days, hours, minutes, firstPaymentPickerValue, remindPickerValue, methodLabel, monthlyRateText, monthlyPaymentText, remindTimeText, pad2, noop: noop2, goSchedule, loadDetail, chooseRepaymentMethod, buildFirstPaymentPickerValue, openFirstPaymentPicker, closeFirstPaymentPicker, onFirstPaymentPickerChange, confirmFirstPaymentPicker, onRemindCardClick, onRemindToggle, openReminderPicker, closeReminderPicker, onRemindPickerChange, confirmReminderPicker, submitUpdate, confirmDelete, computed: vue.computed, reactive: vue.reactive, ref: vue.ref, get onLoad() {
        return onLoad;
      }, get deleteLoan() {
        return deleteLoan;
      }, get getLoanDetail() {
        return getLoanDetail;
      }, get updateLoan() {
        return updateLoan;
      }, get REPAYMENT_METHOD_LABELS() {
        return REPAYMENT_METHOD_LABELS;
      }, get REPAYMENT_METHODS() {
        return REPAYMENT_METHODS;
      }, get calculateSchedule() {
        return calculateSchedule;
      }, get calcMonthlyRate() {
        return calcMonthlyRate;
      }, get normalizeRepaymentMethod() {
        return normalizeRepaymentMethod;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
    return $setup.loaded ? (vue.openBlock(), vue.createElementBlock("view", {
      key: 0,
      class: "page"
    }, [
      vue.createElementVNode("scroll-view", {
        "scroll-y": "",
        class: "content"
      }, [
        vue.createElementVNode("view", { class: "section-card single-line" }, [
          vue.createElementVNode("text", { class: "item-label" }, "贷款名称"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.form.loan_name = $event),
              class: "item-input",
              maxlength: "100",
              placeholder: "请输入贷款名称",
              "placeholder-class": "placeholder"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.loan_name]
          ])
        ]),
        vue.createElementVNode("view", { class: "section-card" }, [
          vue.createElementVNode("view", { class: "item-row" }, [
            vue.createElementVNode("text", { class: "item-label" }, "贷款总额(元)"),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.form.principal = $event),
                class: "item-input",
                type: "digit",
                placeholder: "请输入8位数内的整数",
                "placeholder-class": "placeholder"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $setup.form.principal]
            ])
          ]),
          vue.createElementVNode("view", { class: "item-row" }, [
            vue.createElementVNode("view", null, [
              vue.createElementVNode("text", { class: "item-label" }, "贷款年利率(%)"),
              vue.createElementVNode(
                "text",
                { class: "item-sub" },
                "贷款月利率" + vue.toDisplayString($setup.monthlyRateText),
                1
                /* TEXT */
              )
            ]),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $setup.form.annual_rate = $event),
                class: "item-input",
                type: "digit",
                placeholder: "请输入100内的数字",
                "placeholder-class": "placeholder"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $setup.form.annual_rate]
            ])
          ]),
          vue.createElementVNode("view", { class: "item-row" }, [
            vue.createElementVNode("text", { class: "item-label" }, "贷款期限(月)"),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.form.term_months = $event),
                class: "item-input",
                type: "number",
                placeholder: "请输入1-360的整数",
                "placeholder-class": "placeholder"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $setup.form.term_months]
            ])
          ]),
          vue.createElementVNode("view", {
            class: "item-row clickable",
            onClick: $setup.chooseRepaymentMethod
          }, [
            vue.createElementVNode("text", { class: "item-label" }, "还款方式"),
            vue.createElementVNode("view", { class: "item-value-wrap" }, [
              vue.createElementVNode(
                "text",
                { class: "item-value" },
                vue.toDisplayString($setup.methodLabel),
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", { class: "arrow" }, "›")
            ])
          ]),
          vue.createElementVNode("view", {
            class: "item-row clickable",
            onClick: $setup.openFirstPaymentPicker
          }, [
            vue.createElementVNode("text", { class: "item-label" }, "首期支付"),
            vue.createElementVNode("view", { class: "item-value-wrap" }, [
              vue.createElementVNode(
                "text",
                { class: "item-value" },
                vue.toDisplayString($setup.form.first_payment || "-"),
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", { class: "arrow" }, "›")
            ])
          ]),
          vue.createElementVNode("view", {
            class: "item-row clickable",
            onClick: $setup.goSchedule
          }, [
            vue.createElementVNode("view", null, [
              vue.createElementVNode("text", { class: "item-label item-accent" }, "本月付款金额"),
              vue.createElementVNode(
                "text",
                { class: "payment-amount" },
                "¥" + vue.toDisplayString($setup.monthlyPaymentText),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("text", { class: "arrow" }, "›")
          ])
        ]),
        vue.createElementVNode("view", {
          class: "section-card remind-card",
          onClick: $setup.onRemindCardClick
        }, [
          vue.createElementVNode("view", null, [
            vue.createElementVNode("text", { class: "item-label" }, "还款提醒"),
            vue.createElementVNode(
              "text",
              { class: "item-sub" },
              vue.toDisplayString($setup.remindTimeText),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("switch", {
            checked: $setup.form.remind_enabled,
            color: "#ff4d3a",
            onChange: $setup.onRemindToggle,
            onClick: vue.withModifiers($setup.noop, ["stop"])
          }, null, 40, ["checked"])
        ])
      ]),
      vue.createElementVNode("view", { class: "bottom-actions" }, [
        vue.createElementVNode("button", {
          class: "action-btn btn-delete",
          onClick: $setup.confirmDelete
        }, "删除"),
        vue.createElementVNode("button", {
          class: "action-btn btn-submit",
          onClick: $setup.submitUpdate
        }, "提交修改")
      ]),
      $setup.showFirstPaymentPicker ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "picker-mask",
        onClick: $setup.closeFirstPaymentPicker
      }, [
        vue.createElementVNode("view", {
          class: "picker-panel",
          onClick: vue.withModifiers($setup.noop, ["stop"])
        }, [
          vue.createElementVNode("view", { class: "picker-header" }, [
            vue.createElementVNode("text", {
              class: "header-btn cancel",
              onClick: $setup.closeFirstPaymentPicker
            }, "取消"),
            vue.createElementVNode("text", { class: "header-title" }, "首期支付"),
            vue.createElementVNode("text", {
              class: "header-btn confirm",
              onClick: $setup.confirmFirstPaymentPicker
            }, "确定")
          ]),
          vue.createElementVNode("picker-view", {
            value: $setup.firstPaymentPickerValue,
            class: "picker-view",
            onChange: $setup.onFirstPaymentPickerChange
          }, [
            vue.createElementVNode("picker-view-column", null, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($setup.years, (item) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: `y-${item}`,
                      class: "picker-item"
                    },
                    vue.toDisplayString(item) + "年",
                    1
                    /* TEXT */
                  );
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            vue.createElementVNode("picker-view-column", null, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($setup.months, (item) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: `mo-${item}`,
                      class: "picker-item"
                    },
                    vue.toDisplayString(item) + "月",
                    1
                    /* TEXT */
                  );
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ], 40, ["value"])
        ])
      ])) : vue.createCommentVNode("v-if", true),
      $setup.showReminderPicker ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "picker-mask",
        onClick: $setup.closeReminderPicker
      }, [
        vue.createElementVNode("view", {
          class: "picker-panel",
          onClick: vue.withModifiers($setup.noop, ["stop"])
        }, [
          vue.createElementVNode("view", { class: "picker-header" }, [
            vue.createElementVNode("text", {
              class: "header-btn cancel",
              onClick: $setup.closeReminderPicker
            }, "取消"),
            vue.createElementVNode("text", { class: "header-title" }, "每月提醒"),
            vue.createElementVNode("text", {
              class: "header-btn confirm",
              onClick: $setup.confirmReminderPicker
            }, "确定")
          ]),
          vue.createElementVNode("picker-view", {
            value: $setup.remindPickerValue,
            class: "picker-view",
            onChange: $setup.onRemindPickerChange
          }, [
            vue.createElementVNode("picker-view-column", null, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($setup.days, (item) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: `d-${item}`,
                      class: "picker-item"
                    },
                    vue.toDisplayString(item) + "日",
                    1
                    /* TEXT */
                  );
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            vue.createElementVNode("picker-view-column", null, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($setup.hours, (item) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: `h-${item}`,
                      class: "picker-item"
                    },
                    vue.toDisplayString($setup.pad2(item)),
                    1
                    /* TEXT */
                  );
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            vue.createElementVNode("picker-view-column", null, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($setup.minutes, (item) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: `m-${item}`,
                      class: "picker-item"
                    },
                    vue.toDisplayString($setup.pad2(item)),
                    1
                    /* TEXT */
                  );
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ], 40, ["value"])
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ])) : vue.createCommentVNode("v-if", true);
  }
  const PagesLoanEditIndex = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$4], ["__scopeId", "data-v-64a83418"], ["__file", "/Users/wangjun/Documents/GitHub/金融APP/mobile/src/pages/loan/edit/index.vue"]]);
  const _sfc_main$4 = {
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const loaded = vue.ref(false);
      const summary = vue.ref({
        principal: 0,
        totalInterest: 0
      });
      const schedule = vue.ref([]);
      function parseFirstPayment(firstPayment) {
        const now2 = /* @__PURE__ */ new Date();
        const [yearText, monthText] = String(firstPayment || "").split("/");
        const year = Number(yearText) || now2.getFullYear();
        const month = Number(monthText) || now2.getMonth() + 1;
        return { year, month };
      }
      function buildPeriodLabel(startYear, startMonth, offset) {
        const totalMonth = startYear * 12 + (startMonth - 1) + offset;
        const year = Math.floor(totalMonth / 12);
        const month = totalMonth % 12 + 1;
        return `${year}/${month}`;
      }
      function formatMoney(value) {
        return Number(value || 0).toFixed(2);
      }
      async function loadSchedule(id) {
        const res = await getLoanSchedule(id);
        if (res.success) {
          summary.value = res.data.summary || { principal: 0, totalInterest: 0 };
          schedule.value = res.data.schedule || [];
          loaded.value = true;
        }
      }
      function loadPreviewSchedule(options) {
        const principal = Number(options.principal || 0);
        const annualRate = Number(options.annual_rate || 0);
        const termMonths = Number(options.term_months || 0);
        const repaymentMethod = normalizeRepaymentMethod(options.repayment_method);
        const firstPayment = options.first_payment || "";
        if (!(principal > 0 && termMonths > 0)) {
          uni.showToast({ title: "预览参数不完整", icon: "none" });
          return;
        }
        const rawSchedule = calculateSchedule({
          principal,
          annualRate,
          termMonths,
          repaymentMethod
        });
        const firstDate = parseFirstPayment(firstPayment);
        schedule.value = rawSchedule.map((item, index) => ({
          ...item,
          periodLabel: buildPeriodLabel(firstDate.year, firstDate.month, index),
          is_current: index === 0
        }));
        summary.value = {
          principal,
          totalInterest: getTotalInterest(rawSchedule)
        };
        loaded.value = true;
      }
      onLoad((options) => {
        if (options.mode === "preview") {
          loadPreviewSchedule(options);
          return;
        }
        loadSchedule(options.id);
      });
      const __returned__ = { loaded, summary, schedule, parseFirstPayment, buildPeriodLabel, formatMoney, loadSchedule, loadPreviewSchedule, ref: vue.ref, get onLoad() {
        return onLoad;
      }, get getLoanSchedule() {
        return getLoanSchedule;
      }, get calculateSchedule() {
        return calculateSchedule;
      }, get getTotalInterest() {
        return getTotalInterest;
      }, get normalizeRepaymentMethod() {
        return normalizeRepaymentMethod;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return $setup.loaded ? (vue.openBlock(), vue.createElementBlock("view", {
      key: 0,
      class: "page"
    }, [
      vue.createElementVNode("view", { class: "summary-card" }, [
        vue.createElementVNode("view", { class: "summary-cell" }, [
          vue.createElementVNode(
            "text",
            { class: "summary-value" },
            vue.toDisplayString($setup.formatMoney($setup.summary.principal)),
            1
            /* TEXT */
          ),
          vue.createElementVNode("text", { class: "summary-label" }, "贷款总额(元)")
        ]),
        vue.createElementVNode("view", { class: "summary-cell" }, [
          vue.createElementVNode(
            "text",
            { class: "summary-value" },
            vue.toDisplayString($setup.formatMoney($setup.summary.totalInterest)),
            1
            /* TEXT */
          ),
          vue.createElementVNode("text", { class: "summary-label" }, "利息总额(元)")
        ])
      ]),
      vue.createElementVNode("view", { class: "table-header" }, [
        vue.createElementVNode("text", { class: "header-col" }, "日期"),
        vue.createElementVNode("text", { class: "header-col center" }, "付款(元)"),
        vue.createElementVNode("text", { class: "header-col right" }, "余额(元)")
      ]),
      vue.createElementVNode("scroll-view", {
        "scroll-y": "",
        class: "table-body"
      }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.schedule, (item) => {
            return vue.openBlock(), vue.createElementBlock(
              "view",
              {
                key: item.period,
                class: vue.normalizeClass(["table-row", { active: item.is_current }])
              },
              [
                vue.createElementVNode("view", { class: "col-date" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "date-text" },
                    vue.toDisplayString(item.periodLabel),
                    1
                    /* TEXT */
                  ),
                  item.is_current ? (vue.openBlock(), vue.createElementBlock("text", {
                    key: 0,
                    class: "current-tag"
                  }, "本月付款")) : vue.createCommentVNode("v-if", true)
                ]),
                vue.createElementVNode(
                  "text",
                  { class: "col-payment" },
                  vue.toDisplayString($setup.formatMoney(item.payment)),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "col-balance" },
                  vue.toDisplayString($setup.formatMoney(item.balance)),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            );
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])
    ])) : vue.createCommentVNode("v-if", true);
  }
  const PagesLoanScheduleIndex = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__scopeId", "data-v-5617d974"], ["__file", "/Users/wangjun/Documents/GitHub/金融APP/mobile/src/pages/loan/schedule/index.vue"]]);
  const _imports_0$1 = "/assets/default-avatar.3ed71abf.png";
  const _sfc_main$3 = {
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const userStore = useUserStore();
      const isAppChannel = vue.computed(() => {
        var _a, _b;
        return ((_a = userStore.userInfo) == null ? void 0 : _a.platform) === "app" || ((_b = userStore.userInfo) == null ? void 0 : _b.notify_type) === "push";
      });
      const notifyTypeLabel = vue.computed(() => {
        var _a, _b;
        if (((_a = userStore.userInfo) == null ? void 0 : _a.notify_type) === "push") {
          return "APP 推送";
        }
        if (((_b = userStore.userInfo) == null ? void 0 : _b.notify_type) === "sms") {
          return "短信提醒";
        }
        return "未开启";
      });
      const maskPhone = (phone) => phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : "";
      const goLogin = () => uni.navigateTo({ url: "/pages/login/index" });
      const showAbout = () => uni.showModal({ title: "关于我们", content: "贷款提醒助手\n帮助您管理贷款还款", showCancel: false });
      const showFeedback = () => uni.showToast({ title: "功能开发中", icon: "none" });
      const handleLogout = () => {
        uni.showModal({
          title: "提示",
          content: "确定退出登录？",
          success: (res) => {
            if (res.confirm) {
              userStore.logout();
              uni.showToast({ title: "已退出", icon: "success" });
            }
          }
        });
      };
      const __returned__ = { userStore, isAppChannel, notifyTypeLabel, maskPhone, goLogin, showAbout, showFeedback, handleLogout, computed: vue.computed, get useUserStore() {
        return useUserStore;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    var _a, _b, _c, _d, _e;
    return vue.openBlock(), vue.createElementBlock("view", { class: "mine-page" }, [
      $setup.userStore.isLoggedIn ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "user-card"
      }, [
        vue.createElementVNode("image", {
          class: "avatar",
          src: ((_a = $setup.userStore.userInfo) == null ? void 0 : _a.avatar) || "/static/default-avatar.png",
          mode: "aspectFill"
        }, null, 8, ["src"]),
        vue.createElementVNode("view", { class: "user-info" }, [
          vue.createElementVNode(
            "text",
            { class: "nickname" },
            vue.toDisplayString(((_b = $setup.userStore.userInfo) == null ? void 0 : _b.nickname) || "用户"),
            1
            /* TEXT */
          ),
          vue.createElementVNode(
            "text",
            { class: "phone" },
            vue.toDisplayString($setup.maskPhone((_c = $setup.userStore.userInfo) == null ? void 0 : _c.phone)),
            1
            /* TEXT */
          )
        ])
      ])) : (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "user-card login-card",
        onClick: $setup.goLogin
      }, [
        vue.createElementVNode("image", {
          class: "avatar",
          src: _imports_0$1,
          mode: "aspectFill"
        }),
        vue.createElementVNode("view", { class: "user-info" }, [
          vue.createElementVNode("text", { class: "login-text" }, "点击手机号登录"),
          vue.createElementVNode("text", { class: "login-sub" }, "登录后自动配置提醒渠道")
        ]),
        vue.createElementVNode("text", { class: "arrow" }, "›")
      ])),
      $setup.userStore.isLoggedIn ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 2,
        class: "status-card"
      }, [
        vue.createElementVNode("view", { class: "status-row" }, [
          vue.createElementVNode("text", { class: "status-label" }, "提醒渠道"),
          vue.createElementVNode(
            "text",
            { class: "status-value" },
            vue.toDisplayString($setup.notifyTypeLabel),
            1
            /* TEXT */
          )
        ]),
        $setup.isAppChannel ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "status-row"
        }, [
          vue.createElementVNode("text", { class: "status-label" }, "推送设备"),
          vue.createElementVNode(
            "text",
            {
              class: vue.normalizeClass(["status-value", { "status-value-active": (_d = $setup.userStore.userInfo) == null ? void 0 : _d.push_client_bound }])
            },
            vue.toDisplayString(((_e = $setup.userStore.userInfo) == null ? void 0 : _e.push_client_bound) ? "已绑定当前设备" : "等待绑定设备"),
            3
            /* TEXT, CLASS */
          )
        ])) : vue.createCommentVNode("v-if", true)
      ])) : vue.createCommentVNode("v-if", true),
      vue.createElementVNode("view", { class: "menu-card" }, [
        vue.createElementVNode("view", {
          class: "menu-item",
          onClick: $setup.showAbout
        }, [
          vue.createElementVNode("view", { class: "menu-icon icon-about" }, [
            vue.createElementVNode("view", { class: "about-circle" }),
            vue.createElementVNode("view", { class: "about-dot" }),
            vue.createElementVNode("view", { class: "about-line" })
          ]),
          vue.createElementVNode("view", { class: "menu-content" }, [
            vue.createElementVNode("text", { class: "menu-title" }, "关于我们"),
            vue.createElementVNode("text", { class: "menu-desc" }, "贷款提醒助手，帮助您管理还款计划")
          ]),
          vue.createElementVNode("text", { class: "arrow" }, "›")
        ]),
        vue.createElementVNode("view", {
          class: "menu-item",
          onClick: $setup.showFeedback
        }, [
          vue.createElementVNode("view", { class: "menu-icon icon-feedback" }, [
            vue.createElementVNode("view", { class: "feedback-box" }),
            vue.createElementVNode("view", { class: "feedback-tail" })
          ]),
          vue.createElementVNode("view", { class: "menu-content" }, [
            vue.createElementVNode("text", { class: "menu-title" }, "意见反馈"),
            vue.createElementVNode("text", { class: "menu-desc" }, "提交优化建议，我们持续改进")
          ]),
          vue.createElementVNode("text", { class: "arrow" }, "›")
        ])
      ]),
      $setup.userStore.isLoggedIn ? (vue.openBlock(), vue.createElementBlock("button", {
        key: 3,
        class: "logout-btn",
        onClick: $setup.handleLogout
      }, "退出登录")) : vue.createCommentVNode("v-if", true),
      vue.createElementVNode("view", { class: "version" }, "版本 1.0.0")
    ]);
  }
  const PagesMineIndex = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__scopeId", "data-v-9023ef44"], ["__file", "/Users/wangjun/Documents/GitHub/金融APP/mobile/src/pages/mine/index.vue"]]);
  const APP_PUSH_MESSAGE_EVENT = "app:push-message";
  let pushListenerInitialized = false;
  function wait(duration) {
    return new Promise((resolve) => setTimeout(resolve, duration));
  }
  function getSafeDeviceInfo() {
    if (typeof uni.getDeviceInfo === "function") {
      return uni.getDeviceInfo() || {};
    }
    if (typeof uni.getSystemInfoSync === "function") {
      return uni.getSystemInfoSync() || {};
    }
    return {};
  }
  function getSafeAppBaseInfo() {
    if (typeof uni.getAppBaseInfo === "function") {
      return uni.getAppBaseInfo() || {};
    }
    return {};
  }
  function getUniPushClientId() {
    return new Promise((resolve) => {
      if (typeof uni.getPushClientId !== "function") {
        resolve("");
        return;
      }
      uni.getPushClientId({
        success: (result) => resolve((result == null ? void 0 : result.cid) || (result == null ? void 0 : result.clientid) || ""),
        fail: () => resolve("")
      });
    });
  }
  function getPlusPushClientInfo() {
    return new Promise((resolve) => {
      if (typeof plus === "undefined" || !plus.push) {
        resolve({});
        return;
      }
      if (typeof plus.push.getClientInfoAsync === "function") {
        plus.push.getClientInfoAsync(
          (result) => resolve(result || {}),
          () => resolve(typeof plus.push.getClientInfo === "function" ? plus.push.getClientInfo() || {} : {})
        );
        return;
      }
      resolve(typeof plus.push.getClientInfo === "function" ? plus.push.getClientInfo() || {} : {});
    });
  }
  async function waitForPushIdentity(maxAttempts = 5, intervalMs = 400) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const [uniClientId, plusClientInfo] = await Promise.all([
        getUniPushClientId(),
        getPlusPushClientInfo()
      ]);
      const pushClientId = uniClientId || (plusClientInfo == null ? void 0 : plusClientInfo.clientid) || "";
      const pushChannel = (plusClientInfo == null ? void 0 : plusClientInfo.id) || "unipush";
      if (pushClientId) {
        return {
          push_client_id: pushClientId,
          push_channel: pushChannel
        };
      }
      if (attempt < maxAttempts - 1) {
        await wait(intervalMs);
      }
    }
    return null;
  }
  async function getAppPushRegistrationPayload() {
    const pushIdentity = await waitForPushIdentity();
    if (!(pushIdentity == null ? void 0 : pushIdentity.push_client_id)) {
      return null;
    }
    const deviceInfo = getSafeDeviceInfo();
    const appBaseInfo = getSafeAppBaseInfo();
    return {
      ...pushIdentity,
      device_brand: deviceInfo.brand || deviceInfo.deviceBrand || "",
      device_model: deviceInfo.model || deviceInfo.deviceModel || "",
      os_name: deviceInfo.osName || deviceInfo.platform || "",
      os_version: deviceInfo.osVersion || deviceInfo.system || "",
      app_version: appBaseInfo.version || appBaseInfo.appVersion || ""
    };
  }
  function normalizePushPayload(rawPayload) {
    if (!rawPayload) {
      return {};
    }
    if (typeof rawPayload === "string") {
      try {
        return JSON.parse(rawPayload);
      } catch (error) {
        return {};
      }
    }
    if (typeof rawPayload === "object") {
      return rawPayload;
    }
    return {};
  }
  function resolvePushTargetUrl(payload = {}) {
    if (payload.targetPage === "loanSchedule" && payload.loanId) {
      return `/pages/loan/schedule/index?id=${payload.loanId}`;
    }
    return "";
  }
  function navigateByPushPayload(payload = {}) {
    const targetUrl = resolvePushTargetUrl(payload);
    if (targetUrl) {
      uni.navigateTo({
        url: targetUrl,
        fail: () => {
          uni.switchTab({ url: "/pages/index/index" });
        }
      });
      return;
    }
    uni.switchTab({ url: "/pages/index/index" });
  }
  function initAppPushMessageListener() {
    if (pushListenerInitialized || typeof uni.onPushMessage !== "function") {
      return;
    }
    uni.onPushMessage((message) => {
      var _a;
      const payload = normalizePushPayload((_a = message == null ? void 0 : message.data) == null ? void 0 : _a.payload);
      uni.$emit(APP_PUSH_MESSAGE_EVENT, {
        ...message,
        payload
      });
      if ((message == null ? void 0 : message.type) === "click") {
        navigateByPushPayload(payload);
      }
    });
    pushListenerInitialized = true;
  }
  async function syncAppPushDeviceRegistration() {
    const token = uni.getStorageSync("token") || "";
    if (!token) {
      return {
        success: false,
        skipped: true,
        reason: "not_logged_in"
      };
    }
    const payload = await getAppPushRegistrationPayload();
    if (!(payload == null ? void 0 : payload.push_client_id)) {
      return {
        success: false,
        skipped: true,
        reason: "missing_push_client_id"
      };
    }
    try {
      return await syncPushDevice(payload);
    } catch (error) {
      return {
        success: false,
        skipped: false,
        reason: "request_failed",
        error
      };
    }
  }
  const _imports_0 = "/assets/default-avatar.3ed71abf.png";
  const _sfc_main$2 = {
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const homeStore = useHomeStore();
      const userStore = useUserStore();
      const phone = vue.ref("");
      const loading = vue.ref(false);
      const getMiniappCode = () => new Promise((resolve) => {
        uni.login({
          success: (res) => resolve(res.code || ""),
          fail: () => resolve("")
        });
      });
      function redirectAfterLogin() {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          uni.navigateBack();
          return;
        }
        uni.switchTab({
          url: "/pages/index/index"
        });
      }
      const handleLogin = async () => {
        var _a, _b, _c;
        if (!/^1\d{10}$/.test(phone.value)) {
          return uni.showToast({ title: "请输入正确的手机号", icon: "none" });
        }
        loading.value = true;
        try {
          let wechatCode = "";
          let platform = "miniapp";
          let appPushPayload = {};
          platform = "app";
          appPushPayload = await getAppPushRegistrationPayload() || {};
          const res = await userStore.login(phone.value, platform, {
            wechat_code: wechatCode,
            ...appPushPayload
          });
          if (res.success) {
            const syncResult = await syncAppPushDeviceRegistration();
            if (syncResult == null ? void 0 : syncResult.success) {
              userStore.updateUser({
                push_client_bound: true,
                push_channel: ((_a = syncResult == null ? void 0 : syncResult.data) == null ? void 0 : _a.push_channel) || ((_c = (_b = syncResult == null ? void 0 : syncResult.data) == null ? void 0 : _b.device) == null ? void 0 : _c.push_channel) || appPushPayload.push_channel || "unipush"
              });
            }
            homeStore.requestRefresh("phoneLoginSuccess");
            await homeStore.loadDashboard("phoneLoginSuccess");
            uni.showToast({ title: "登录成功", icon: "success" });
            setTimeout(redirectAfterLogin, 300);
          }
        } catch (error) {
          uni.showToast({ title: (error == null ? void 0 : error.message) || "登录失败，请重试", icon: "none" });
        } finally {
          loading.value = false;
        }
      };
      onShow(() => {
        if (userStore.isLoggedIn) {
          redirectAfterLogin();
        }
      });
      const __returned__ = { homeStore, userStore, phone, loading, getMiniappCode, redirectAfterLogin, handleLogin, ref: vue.ref, get onShow() {
        return onShow;
      }, get useHomeStore() {
        return useHomeStore;
      }, get useUserStore() {
        return useUserStore;
      }, get getAppPushRegistrationPayload() {
        return getAppPushRegistrationPayload;
      }, get syncAppPushDeviceRegistration() {
        return syncAppPushDeviceRegistration;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "login-page" }, [
      vue.createElementVNode("view", { class: "login-header" }, [
        vue.createElementVNode("image", {
          src: _imports_0,
          class: "logo",
          mode: "aspectFit"
        }),
        vue.createElementVNode("text", { class: "title" }, "贷款提醒"),
        vue.createElementVNode("text", { class: "subtitle" }, "管理贷款，准时还款")
      ]),
      vue.createElementVNode("view", { class: "login-form" }, [
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "prefix" }, "+86"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.phone = $event),
              type: "number",
              placeholder: "请输入手机号",
              maxlength: "11"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.phone]
          ])
        ]),
        vue.createElementVNode("button", {
          class: "login-btn",
          onClick: $setup.handleLogin,
          loading: $setup.loading,
          disabled: !$setup.phone || $setup.phone.length !== 11
        }, " 登录 / 注册 ", 8, ["loading", "disabled"])
      ]),
      vue.createElementVNode("view", { class: "login-footer" }, [
        vue.createElementVNode("text", { class: "tip" }, "登录即表示同意"),
        vue.createElementVNode("text", { class: "link" }, "《用户协议》"),
        vue.createElementVNode("text", { class: "tip" }, "和"),
        vue.createElementVNode("text", { class: "link" }, "《隐私政策》")
      ])
    ]);
  }
  const PagesLoginIndex = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-45258083"], ["__file", "/Users/wangjun/Documents/GitHub/金融APP/mobile/src/pages/login/index.vue"]]);
  const _sfc_main$1 = {
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const pageUrl = vue.ref("");
      const isValidHttpUrl = (url) => /^https?:\/\/.+/i.test(url);
      const initPageUrl = (options = {}) => {
        const decodedUrl = decodeURIComponent(options.url || "");
        if (!decodedUrl || !isValidHttpUrl(decodedUrl)) {
          pageUrl.value = "";
          return;
        }
        pageUrl.value = decodedUrl;
      };
      onLoad((options) => {
        initPageUrl(options);
      });
      const __returned__ = { pageUrl, isValidHttpUrl, initPageUrl, ref: vue.ref, get onLoad() {
        return onLoad;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "webview-page" }, [
      $setup.pageUrl ? (vue.openBlock(), vue.createElementBlock("web-view", {
        key: 0,
        src: $setup.pageUrl
      }, null, 8, ["src"])) : (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "empty-state"
      }, [
        vue.createElementVNode("text", { class: "empty-title" }, "链接无效"),
        vue.createElementVNode("text", { class: "empty-desc" }, "未找到可打开的网页地址")
      ]))
    ]);
  }
  const PagesWebviewIndex = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__scopeId", "data-v-f397c225"], ["__file", "/Users/wangjun/Documents/GitHub/金融APP/mobile/src/pages/webview/index.vue"]]);
  __definePage("pages/index/index", PagesIndexIndex);
  __definePage("pages/loan/add/index", PagesLoanAddIndex);
  __definePage("pages/loan/edit/index", PagesLoanEditIndex);
  __definePage("pages/loan/schedule/index", PagesLoanScheduleIndex);
  __definePage("pages/mine/index", PagesMineIndex);
  __definePage("pages/login/index", PagesLoginIndex);
  __definePage("pages/webview/index", PagesWebviewIndex);
  const _sfc_main = {
    __name: "App",
    setup(__props, { expose: __expose }) {
      __expose();
      const userStore = useUserStore();
      async function syncAppPushBindingIfNeeded() {
        var _a, _b, _c;
        const result = await syncAppPushDeviceRegistration();
        if (result == null ? void 0 : result.success) {
          userStore.updateUser({
            push_client_bound: true,
            push_channel: ((_a = result == null ? void 0 : result.data) == null ? void 0 : _a.push_channel) || ((_c = (_b = result == null ? void 0 : result.data) == null ? void 0 : _b.device) == null ? void 0 : _c.push_channel) || "unipush"
          });
        }
      }
      onLaunch(() => {
        initAppPushMessageListener();
        syncAppPushBindingIfNeeded();
      });
      onShow(() => {
        syncAppPushBindingIfNeeded();
      });
      const __returned__ = { userStore, syncAppPushBindingIfNeeded, get onLaunch() {
        return onLaunch;
      }, get onShow() {
        return onShow;
      }, get useUserStore() {
        return useUserStore;
      }, get initAppPushMessageListener() {
        return initAppPushMessageListener;
      }, get syncAppPushDeviceRegistration() {
        return syncAppPushDeviceRegistration;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/Users/wangjun/Documents/GitHub/金融APP/mobile/src/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    const pinia = createPinia();
    app.use(pinia);
    return { app };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
