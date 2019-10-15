
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function get_binding_group_value(group) {
        const value = [];
        for (let i = 0; i < group.length; i += 1) {
            if (group[i].checked)
                value.push(group[i].__value);
        }
        return value;
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(html, anchor = null) {
            this.e = element('div');
            this.a = anchor;
            this.u(html);
        }
        m(target, anchor = null) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(target, this.n[i], anchor);
            }
            this.t = target;
        }
        u(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        p(html) {
            this.d();
            this.u(html);
            this.m(this.t, this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = key && { [key]: value };
            const child_ctx = assign(assign({}, info.ctx), info.resolved);
            const block = type && (info.current = type)(child_ctx);
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                flush();
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = { [info.value]: promise };
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, changed, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(changed, child_ctx);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }

    function bind(component, name, callback) {
        if (component.$$.props.indexOf(name) === -1)
            return;
        component.$$.bound[name] = callback;
        callback(component.$$.ctx[name]);
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/components/HelloWorld.svelte generated by Svelte v3.12.1 */

    const file = "src/components/HelloWorld.svelte";

    function create_fragment(ctx) {
    	var h1, t0, t1_value = ctx.name.toUpperCase() + "", t1, t2;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t0 = text("Hello ");
    			t1 = text(t1_value);
    			t2 = text("!");
    			attr_dev(h1, "class", "svelte-ic9zel");
    			add_location(h1, file, 11, 0, 139);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.name) && t1_value !== (t1_value = ctx.name.toUpperCase() + "")) {
    				set_data_dev(t1, t1_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { name } = $$props;

    	const writable_props = ['name'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<HelloWorld> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    	};

    	$$self.$capture_state = () => {
    		return { name };
    	};

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    	};

    	return { name };
    }

    class HelloWorld extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["name"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "HelloWorld", options, id: create_fragment.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.name === undefined && !('name' in props)) {
    			console.warn("<HelloWorld> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<HelloWorld>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<HelloWorld>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Image.svelte generated by Svelte v3.12.1 */

    const file$1 = "src/components/Image.svelte";

    function create_fragment$1(ctx) {
    	var img;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "src", src);
    			attr_dev(img, "alt", "Puppies love learning about Svelte");
    			add_location(img, file$1, 5, 0, 111);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(img);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    let src = "./images/4XSc0NkhKJQhW.gif";

    class Image extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Image", options, id: create_fragment$1.name });
    	}
    }

    /* src/components/Nested.svelte generated by Svelte v3.12.1 */

    const file$2 = "src/components/Nested.svelte";

    function create_fragment$2(ctx) {
    	var span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "nested component, but without the worst paragraph styles bleeding in";
    			add_location(span, file$2, 0, 0, 0);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    class Nested extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$2, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Nested", options, id: create_fragment$2.name });
    	}
    }

    /* src/components/WorstParagraph.svelte generated by Svelte v3.12.1 */

    const file$3 = "src/components/WorstParagraph.svelte";

    function create_fragment$3(ctx) {
    	var p, t_1, current;

    	var nested = new Nested({ $$inline: true });

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "This is the worst paragraph.";
    			t_1 = space();
    			nested.$$.fragment.c();
    			attr_dev(p, "class", "svelte-8iq0a5");
    			add_location(p, file$3, 13, 0, 202);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t_1, anchor);
    			mount_component(nested, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(nested.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(nested.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    				detach_dev(t_1);
    			}

    			destroy_component(nested, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    class WorstParagraph extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$3, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "WorstParagraph", options, id: create_fragment$3.name });
    	}
    }

    /* src/components/RiskyHTML.svelte generated by Svelte v3.12.1 */

    const file$4 = "src/components/RiskyHTML.svelte";

    function create_fragment$4(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			add_location(p, file$4, 4, 0, 89);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			p.innerHTML = ctx.string;
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self) {
    	let string = `this string contains some <strong>HTML!!!</strong>`;

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('string' in $$props) $$invalidate('string', string = $$props.string);
    	};

    	return { string };
    }

    class RiskyHTML extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$4, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "RiskyHTML", options, id: create_fragment$4.name });
    	}
    }

    /* src/concepts/Reactivity.svelte generated by Svelte v3.12.1 */

    const file$5 = "src/concepts/Reactivity.svelte";

    function create_fragment$5(ctx) {
    	var h2, t1, button0, t2, t3, t4, t5_value = ctx.count === 1 ? 'time' : 'times' + "", t5, t6, p0, t7, t8, t9, t10, p1, t11_value = ctx.numbers.join(' + ') + "", t11, t12, t13, t14, button1, dispose;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Reactivity";
    			t1 = space();
    			button0 = element("button");
    			t2 = text("Clicked ");
    			t3 = text(ctx.count);
    			t4 = space();
    			t5 = text(t5_value);
    			t6 = space();
    			p0 = element("p");
    			t7 = text(ctx.count);
    			t8 = text(" doubled is ");
    			t9 = text(ctx.doubled);
    			t10 = space();
    			p1 = element("p");
    			t11 = text(t11_value);
    			t12 = text(" = ");
    			t13 = text(ctx.sum);
    			t14 = space();
    			button1 = element("button");
    			button1.textContent = "Add a number";
    			add_location(h2, file$5, 27, 0, 629);
    			add_location(button0, file$5, 30, 0, 683);
    			add_location(p0, file$5, 34, 0, 777);
    			add_location(p1, file$5, 36, 0, 814);
    			add_location(button1, file$5, 38, 0, 852);

    			dispose = [
    				listen_dev(button0, "click", ctx.handleClick),
    				listen_dev(button1, "click", ctx.addNumber)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button0, anchor);
    			append_dev(button0, t2);
    			append_dev(button0, t3);
    			append_dev(button0, t4);
    			append_dev(button0, t5);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t7);
    			append_dev(p0, t8);
    			append_dev(p0, t9);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t11);
    			append_dev(p1, t12);
    			append_dev(p1, t13);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, button1, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.count) {
    				set_data_dev(t3, ctx.count);
    			}

    			if ((changed.count) && t5_value !== (t5_value = ctx.count === 1 ? 'time' : 'times' + "")) {
    				set_data_dev(t5, t5_value);
    			}

    			if (changed.count) {
    				set_data_dev(t7, ctx.count);
    			}

    			if (changed.doubled) {
    				set_data_dev(t9, ctx.doubled);
    			}

    			if ((changed.numbers) && t11_value !== (t11_value = ctx.numbers.join(' + ') + "")) {
    				set_data_dev(t11, t11_value);
    			}

    			if (changed.sum) {
    				set_data_dev(t13, ctx.sum);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h2);
    				detach_dev(t1);
    				detach_dev(button0);
    				detach_dev(t6);
    				detach_dev(p0);
    				detach_dev(t10);
    				detach_dev(p1);
    				detach_dev(t14);
    				detach_dev(button1);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$5.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let count = 0;

      function handleClick() {
        $$invalidate('count', count += 1);
      }

      let numbers = [1, 2, 3, 4];

      function addNumber() {
        //can't use .push() to create reactivity, a la "numbers.push(numbers.length + 1);"
        //numbers = [...numbers, numbers.length + 1];
        //is the same as
        $$invalidate('numbers', numbers[numbers.length] = numbers.length + 1, numbers);
      }

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('count' in $$props) $$invalidate('count', count = $$props.count);
    		if ('numbers' in $$props) $$invalidate('numbers', numbers = $$props.numbers);
    		if ('doubled' in $$props) $$invalidate('doubled', doubled = $$props.doubled);
    		if ('sum' in $$props) $$invalidate('sum', sum = $$props.sum);
    	};

    	let doubled, sum;

    	$$self.$$.update = ($$dirty = { count: 1, numbers: 1 }) => {
    		if ($$dirty.count) { if (count >= 10) {
            alert(`count is dangerously high!`);
            $$invalidate('count', count = 9);
          } }
    		if ($$dirty.count) { $$invalidate('doubled', doubled = count * 2); }
    		if ($$dirty.numbers) { $$invalidate('sum', sum = numbers.reduce((t, n) => t + n, 0)); }
    	};

    	return {
    		count,
    		handleClick,
    		numbers,
    		addNumber,
    		doubled,
    		sum
    	};
    }

    class Reactivity extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$5, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Reactivity", options, id: create_fragment$5.name });
    	}
    }

    /* src/concepts/nested/Child.svelte generated by Svelte v3.12.1 */

    const file$6 = "src/concepts/nested/Child.svelte";

    function create_fragment$6(ctx) {
    	var p, t0, t1, t2, t3, t4;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Child ");
    			t1 = text(ctx.number);
    			t2 = text(": \"The answer is ");
    			t3 = text(ctx.answer);
    			t4 = text(".\"");
    			add_location(p, file$6, 6, 0, 117);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(p, t3);
    			append_dev(p, t4);
    		},

    		p: function update(changed, ctx) {
    			if (changed.number) {
    				set_data_dev(t1, ctx.number);
    			}

    			if (changed.answer) {
    				set_data_dev(t3, ctx.answer);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$6.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	//can provide default values for props
      let { answer = "a mystery", number } = $$props;

    	const writable_props = ['answer', 'number'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Child> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('answer' in $$props) $$invalidate('answer', answer = $$props.answer);
    		if ('number' in $$props) $$invalidate('number', number = $$props.number);
    	};

    	$$self.$capture_state = () => {
    		return { answer, number };
    	};

    	$$self.$inject_state = $$props => {
    		if ('answer' in $$props) $$invalidate('answer', answer = $$props.answer);
    		if ('number' in $$props) $$invalidate('number', number = $$props.number);
    	};

    	return { answer, number };
    }

    class Child extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$6, safe_not_equal, ["answer", "number"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Child", options, id: create_fragment$6.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.number === undefined && !('number' in props)) {
    			console.warn("<Child> was created without expected prop 'number'");
    		}
    	}

    	get answer() {
    		throw new Error("<Child>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set answer(value) {
    		throw new Error("<Child>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get number() {
    		throw new Error("<Child>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set number(value) {
    		throw new Error("<Child>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/concepts/nested/Info.svelte generated by Svelte v3.12.1 */

    const file$7 = "src/concepts/nested/Info.svelte";

    function create_fragment$7(ctx) {
    	var p, t0, code, t1, t2, t3, t4, t5, t6, a0, t7, a0_href_value, t8, a1, t9;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("The\n  ");
    			code = element("code");
    			t1 = text(ctx.name);
    			t2 = text("\n  package is ");
    			t3 = text(ctx.speed);
    			t4 = text(" fast. Download version ");
    			t5 = text(ctx.version);
    			t6 = text(" from\n  ");
    			a0 = element("a");
    			t7 = text("npm");
    			t8 = text("\n  and\n  ");
    			a1 = element("a");
    			t9 = text("learn more here");
    			add_location(code, file$7, 9, 2, 115);
    			attr_dev(a0, "href", a0_href_value = "https://www.npmjs.com/package/" + ctx.name);
    			add_location(a0, file$7, 11, 2, 196);
    			attr_dev(a1, "href", ctx.website);
    			add_location(a1, file$7, 13, 2, 259);
    			add_location(p, file$7, 7, 0, 103);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, code);
    			append_dev(code, t1);
    			append_dev(p, t2);
    			append_dev(p, t3);
    			append_dev(p, t4);
    			append_dev(p, t5);
    			append_dev(p, t6);
    			append_dev(p, a0);
    			append_dev(a0, t7);
    			append_dev(p, t8);
    			append_dev(p, a1);
    			append_dev(a1, t9);
    		},

    		p: function update(changed, ctx) {
    			if (changed.name) {
    				set_data_dev(t1, ctx.name);
    			}

    			if (changed.speed) {
    				set_data_dev(t3, ctx.speed);
    			}

    			if (changed.version) {
    				set_data_dev(t5, ctx.version);
    			}

    			if ((changed.name) && a0_href_value !== (a0_href_value = "https://www.npmjs.com/package/" + ctx.name)) {
    				attr_dev(a0, "href", a0_href_value);
    			}

    			if (changed.website) {
    				attr_dev(a1, "href", ctx.website);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$7.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { name, version, speed, website } = $$props;

    	const writable_props = ['name', 'version', 'speed', 'website'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Info> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('version' in $$props) $$invalidate('version', version = $$props.version);
    		if ('speed' in $$props) $$invalidate('speed', speed = $$props.speed);
    		if ('website' in $$props) $$invalidate('website', website = $$props.website);
    	};

    	$$self.$capture_state = () => {
    		return { name, version, speed, website };
    	};

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('version' in $$props) $$invalidate('version', version = $$props.version);
    		if ('speed' in $$props) $$invalidate('speed', speed = $$props.speed);
    		if ('website' in $$props) $$invalidate('website', website = $$props.website);
    	};

    	return { name, version, speed, website };
    }

    class Info extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$7, safe_not_equal, ["name", "version", "speed", "website"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Info", options, id: create_fragment$7.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.name === undefined && !('name' in props)) {
    			console.warn("<Info> was created without expected prop 'name'");
    		}
    		if (ctx.version === undefined && !('version' in props)) {
    			console.warn("<Info> was created without expected prop 'version'");
    		}
    		if (ctx.speed === undefined && !('speed' in props)) {
    			console.warn("<Info> was created without expected prop 'speed'");
    		}
    		if (ctx.website === undefined && !('website' in props)) {
    			console.warn("<Info> was created without expected prop 'website'");
    		}
    	}

    	get name() {
    		throw new Error("<Info>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Info>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get version() {
    		throw new Error("<Info>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set version(value) {
    		throw new Error("<Info>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get speed() {
    		throw new Error("<Info>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set speed(value) {
    		throw new Error("<Info>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get website() {
    		throw new Error("<Info>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set website(value) {
    		throw new Error("<Info>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/concepts/Props.svelte generated by Svelte v3.12.1 */

    const file$8 = "src/concepts/Props.svelte";

    function create_fragment$8(ctx) {
    	var h2, t1, p, t3, t4, t5, current;

    	var child0 = new Child({
    		props: { number: 1, answer: 42 },
    		$$inline: true
    	});

    	var child1 = new Child({
    		props: { number: 2 },
    		$$inline: true
    	});

    	var info_spread_levels = [
    		ctx.pkg
    	];

    	let info_props = {};
    	for (var i = 0; i < info_spread_levels.length; i += 1) {
    		info_props = assign(info_props, info_spread_levels[i]);
    	}
    	var info = new Info({ props: info_props, $$inline: true });

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Props";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Parent: \"What is the answer?\"";
    			t3 = space();
    			child0.$$.fragment.c();
    			t4 = space();
    			child1.$$.fragment.c();
    			t5 = space();
    			info.$$.fragment.c();
    			add_location(h2, file$8, 12, 0, 238);
    			add_location(p, file$8, 13, 0, 253);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(child0, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(child1, target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(info, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var info_changes = (changed.pkg) ? get_spread_update(info_spread_levels, [
    									get_spread_object(ctx.pkg)
    								]) : {};
    			info.$set(info_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(child0.$$.fragment, local);

    			transition_in(child1.$$.fragment, local);

    			transition_in(info.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(child0.$$.fragment, local);
    			transition_out(child1.$$.fragment, local);
    			transition_out(info.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h2);
    				detach_dev(t1);
    				detach_dev(p);
    				detach_dev(t3);
    			}

    			destroy_component(child0, detaching);

    			if (detaching) {
    				detach_dev(t4);
    			}

    			destroy_component(child1, detaching);

    			if (detaching) {
    				detach_dev(t5);
    			}

    			destroy_component(info, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$8.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$5($$self) {
    	

      const pkg = {
        name: "funicorn",
        version: 112358132134.55,
        speed: "blazing",
        website: "https://svelte.dev"
      };

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { pkg };
    }

    class Props extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$8, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Props", options, id: create_fragment$8.name });
    	}
    }

    /* src/concepts/nested/Thing.svelte generated by Svelte v3.12.1 */

    const file$9 = "src/concepts/nested/Thing.svelte";

    function create_fragment$9(ctx) {
    	var p, span0, t0, t1, span1, t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			span0 = element("span");
    			t0 = text("initial");
    			t1 = space();
    			span1 = element("span");
    			t2 = text("current");
    			set_style(span0, "background-color", ctx.initial);
    			attr_dev(span0, "class", "svelte-671r1c");
    			add_location(span0, file$9, 21, 2, 385);
    			set_style(span1, "background-color", ctx.current);
    			attr_dev(span1, "class", "svelte-671r1c");
    			add_location(span1, file$9, 22, 2, 444);
    			add_location(p, file$9, 20, 0, 379);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, span0);
    			append_dev(span0, t0);
    			append_dev(p, t1);
    			append_dev(p, span1);
    			append_dev(span1, t2);
    		},

    		p: function update(changed, ctx) {
    			if (changed.current) {
    				set_style(span1, "background-color", ctx.current);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$9.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	// `current` is updated whenever the prop value changes...
      let { current } = $$props;

      // ...but `initial` is fixed upon initialisation
      const initial = current;

    	const writable_props = ['current'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Thing> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('current' in $$props) $$invalidate('current', current = $$props.current);
    	};

    	$$self.$capture_state = () => {
    		return { current };
    	};

    	$$self.$inject_state = $$props => {
    		if ('current' in $$props) $$invalidate('current', current = $$props.current);
    	};

    	return { current, initial };
    }

    class Thing extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$9, safe_not_equal, ["current"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Thing", options, id: create_fragment$9.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.current === undefined && !('current' in props)) {
    			console.warn("<Thing> was created without expected prop 'current'");
    		}
    	}

    	get current() {
    		throw new Error("<Thing>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set current(value) {
    		throw new Error("<Thing>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/concepts/Logic.svelte generated by Svelte v3.12.1 */
    const { Error: Error_1 } = globals;

    const file$a = "src/concepts/Logic.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.thing = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.cat = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    // (53:0) {:else}
    function create_else_block(ctx) {
    	var button, dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Log in";
    			add_location(button, file$a, 53, 2, 1136);
    			dispose = listen_dev(button, "click", ctx.toggle);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(button);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(53:0) {:else}", ctx });
    	return block;
    }

    // (51:0) {#if user.loggedIn}
    function create_if_block(ctx) {
    	var button, dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Log out";
    			add_location(button, file$a, 51, 2, 1083);
    			dispose = listen_dev(button, "click", ctx.toggle);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(button);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(51:0) {#if user.loggedIn}", ctx });
    	return block;
    }

    // (60:2) {#each cats as cat, i}
    function create_each_block_1(ctx) {
    	var li, a, t0_value = ctx.i + 1 + "", t0, t1, t2_value = ctx.cat.name + "", t2, t3;

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = text(": ");
    			t2 = text(t2_value);
    			t3 = space();
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", "https://www.youtube.com/watch?v=" + ctx.cat.id);
    			add_location(a, file$a, 61, 6, 1314);
    			add_location(li, file$a, 60, 4, 1303);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t0);
    			append_dev(a, t1);
    			append_dev(a, t2);
    			append_dev(li, t3);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(li);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_1.name, type: "each", source: "(60:2) {#each cats as cat, i}", ctx });
    	return block;
    }

    // (71:0) {#each things as thing (thing.id)}
    function create_each_block(key_1, ctx) {
    	var first, current;

    	var thing = new Thing({
    		props: { current: ctx.thing.color },
    		$$inline: true
    	});

    	const block = {
    		key: key_1,

    		first: null,

    		c: function create() {
    			first = empty();
    			thing.$$.fragment.c();
    			this.first = first;
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(thing, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var thing_changes = {};
    			if (changed.things) thing_changes.current = ctx.thing.color;
    			thing.$set(thing_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(thing.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(thing.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(first);
    			}

    			destroy_component(thing, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(71:0) {#each things as thing (thing.id)}", ctx });
    	return block;
    }

    // (81:0) {:catch error}
    function create_catch_block(ctx) {
    	var p, t_value = ctx.error.message + "", t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			set_style(p, "color", "red");
    			add_location(p, file$a, 81, 2, 1928);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.promise) && t_value !== (t_value = ctx.error.message + "")) {
    				set_data_dev(t, t_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_catch_block.name, type: "catch", source: "(81:0) {:catch error}", ctx });
    	return block;
    }

    // (79:0) {:then number}
    function create_then_block(ctx) {
    	var p, t0, t1_value = ctx.number + "", t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("The number is ");
    			t1 = text(t1_value);
    			add_location(p, file$a, 79, 2, 1881);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.promise) && t1_value !== (t1_value = ctx.number + "")) {
    				set_data_dev(t1, t1_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_then_block.name, type: "then", source: "(79:0) {:then number}", ctx });
    	return block;
    }

    // (77:16)    <p>...waiting</p> {:then number}
    function create_pending_block(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "...waiting";
    			add_location(p, file$a, 77, 2, 1846);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_pending_block.name, type: "pending", source: "(77:16)    <p>...waiting</p> {:then number}", ctx });
    	return block;
    }

    function create_fragment$a(ctx) {
    	var h2, t1, t2, h3, t4, ul, t5, button0, t7, each_blocks = [], each1_lookup = new Map(), t8, button1, t10, await_block_anchor, promise_1, current, dispose;

    	function select_block_type(changed, ctx) {
    		if (ctx.user.loggedIn) return create_if_block;
    		return create_else_block;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block = current_block_type(ctx);

    	let each_value_1 = ctx.cats;

    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = ctx.things;

    	const get_key = ctx => ctx.thing.id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 'number',
    		error: 'error'
    	};

    	handle_promise(promise_1 = ctx.promise, info);

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Logic";
    			t1 = space();
    			if_block.c();
    			t2 = space();
    			h3 = element("h3");
    			h3.textContent = "The Famous Cats of YouTube";
    			t4 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t5 = space();
    			button0 = element("button");
    			button0.textContent = "Remove first thing";
    			t7 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t8 = space();
    			button1 = element("button");
    			button1.textContent = "generate random number";
    			t10 = space();
    			await_block_anchor = empty();

    			info.block.c();
    			add_location(h2, file$a, 47, 0, 986);
    			add_location(h3, file$a, 57, 0, 1233);
    			add_location(ul, file$a, 58, 0, 1269);
    			add_location(button0, file$a, 69, 0, 1540);
    			add_location(button1, file$a, 75, 0, 1758);

    			dispose = [
    				listen_dev(button0, "click", ctx.handleClick),
    				listen_dev(button1, "click", ctx.handleNumberClick)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			if_block.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(ul, null);
    			}

    			insert_dev(target, t5, anchor);
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t7, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t8, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, await_block_anchor, anchor);

    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;

    			current = true;
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if (current_block_type !== (current_block_type = select_block_type(changed, ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(t2.parentNode, t2);
    				}
    			}

    			if (changed.cats) {
    				each_value_1 = ctx.cats;

    				let i;
    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(changed, child_ctx);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}
    				each_blocks_1.length = each_value_1.length;
    			}

    			const each_value = ctx.things;

    			group_outros();
    			each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each1_lookup, t8.parentNode, outro_and_destroy_block, create_each_block, t8, get_each_context);
    			check_outros();

    			info.ctx = ctx;

    			if (('promise' in changed) && promise_1 !== (promise_1 = ctx.promise) && handle_promise(promise_1, info)) ; else {
    				info.block.p(changed, assign(assign({}, ctx), info.resolved));
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h2);
    				detach_dev(t1);
    			}

    			if_block.d(detaching);

    			if (detaching) {
    				detach_dev(t2);
    				detach_dev(h3);
    				detach_dev(t4);
    				detach_dev(ul);
    			}

    			destroy_each(each_blocks_1, detaching);

    			if (detaching) {
    				detach_dev(t5);
    				detach_dev(button0);
    				detach_dev(t7);
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) {
    				detach_dev(t8);
    				detach_dev(button1);
    				detach_dev(t10);
    				detach_dev(await_block_anchor);
    			}

    			info.block.d(detaching);
    			info.token = null;
    			info = null;

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$a.name, type: "component", source: "", ctx });
    	return block;
    }

    async function getRandomNumber() {
      const res = await fetch(
        `https://www.random.org/integers/?num=1&min=1&max=100&col=1&base=10&format=plain&rnd=new`
      );
      const text = await res.text();

      if (res.ok) {
        return text;
      } else {
        throw new Error(text);
      }
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let user = { loggedIn: false };

      function toggle() {
        $$invalidate('user', user.loggedIn = !user.loggedIn, user);
      }

      let cats = [
        { id: "J---aiyznGQ", name: "Keyboard Cat" },
        { id: "z_AbfPXTKms", name: "Maru" },
        { id: "OUtn3pvWmpg", name: "Henri The Existential Cat" }
      ];

      let things = [
        { id: 1, color: "#0d0887" },
        { id: 2, color: "#6a00a8" },
        { id: 3, color: "#b12a90" },
        { id: 4, color: "#e16462" },
        { id: 5, color: "#fca636" }
      ];

      function handleClick() {
        $$invalidate('things', things = things.slice(1));
      }

      let promise = getRandomNumber();

      function handleNumberClick() {
        $$invalidate('promise', promise = getRandomNumber());
      }

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('user' in $$props) $$invalidate('user', user = $$props.user);
    		if ('cats' in $$props) $$invalidate('cats', cats = $$props.cats);
    		if ('things' in $$props) $$invalidate('things', things = $$props.things);
    		if ('promise' in $$props) $$invalidate('promise', promise = $$props.promise);
    	};

    	return {
    		user,
    		toggle,
    		cats,
    		things,
    		handleClick,
    		promise,
    		handleNumberClick
    	};
    }

    class Logic extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$a, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Logic", options, id: create_fragment$a.name });
    	}
    }

    /* src/concepts/nested/Inner.svelte generated by Svelte v3.12.1 */

    const file$b = "src/concepts/nested/Inner.svelte";

    function create_fragment$b(ctx) {
    	var button, dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Click to say hello";
    			add_location(button, file$b, 12, 0, 199);
    			dispose = listen_dev(button, "click", ctx.sayHello);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(button);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$b.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$8($$self) {
    	const dispatch = createEventDispatcher();

      function sayHello() {
        dispatch("message", {
          text: "Hello!"
        });
      }

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { sayHello };
    }

    class Inner extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$b, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Inner", options, id: create_fragment$b.name });
    	}
    }

    /* src/concepts/nested/Outer.svelte generated by Svelte v3.12.1 */

    function create_fragment$c(ctx) {
    	var current;

    	var inner = new Inner({ $$inline: true });
    	inner.$on("message", ctx.message_handler);

    	const block = {
    		c: function create() {
    			inner.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(inner, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(inner.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(inner.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(inner, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$c.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$9($$self) {

    	function message_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { message_handler };
    }

    class Outer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$c, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Outer", options, id: create_fragment$c.name });
    	}
    }

    /* src/concepts/nested/FancyButton.svelte generated by Svelte v3.12.1 */

    const file$c = "src/concepts/nested/FancyButton.svelte";

    function create_fragment$d(ctx) {
    	var button, dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Click me";
    			attr_dev(button, "class", "svelte-11xa71y");
    			add_location(button, file$c, 12, 0, 227);
    			dispose = listen_dev(button, "click", ctx.click_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(button);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$d.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$a($$self) {
    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { click_handler };
    }

    class FancyButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$d, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "FancyButton", options, id: create_fragment$d.name });
    	}
    }

    /* src/concepts/Events.svelte generated by Svelte v3.12.1 */

    const file$d = "src/concepts/Events.svelte";

    function create_fragment$e(ctx) {
    	var h2, t1, div0, t2, t3_value = ctx.m.x + "", t3, t4, t5_value = ctx.m.y + "", t5, t6, div1, t7, t8_value = ctx.m.x + "", t8, t9, t10_value = ctx.m.y + "", t10, t11, button, t13, t14, current, dispose;

    	var outer = new Outer({ $$inline: true });
    	outer.$on("message", handleMessage);

    	var fancybutton = new FancyButton({ $$inline: true });
    	fancybutton.$on("click", handleClick);

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Events";
    			t1 = space();
    			div0 = element("div");
    			t2 = text("The mouse position is ");
    			t3 = text(t3_value);
    			t4 = text(" x ");
    			t5 = text(t5_value);
    			t6 = space();
    			div1 = element("div");
    			t7 = text("The mouse position is ");
    			t8 = text(t8_value);
    			t9 = text(" x ");
    			t10 = text(t10_value);
    			t11 = space();
    			button = element("button");
    			button.textContent = "Click me";
    			t13 = space();
    			outer.$$.fragment.c();
    			t14 = space();
    			fancybutton.$$.fragment.c();
    			add_location(h2, file$d, 32, 0, 494);
    			attr_dev(div0, "class", "svelte-clcob");
    			add_location(div0, file$d, 34, 0, 545);
    			attr_dev(div1, "class", "svelte-clcob");
    			add_location(div1, file$d, 36, 0, 656);
    			add_location(button, file$d, 40, 0, 858);

    			dispose = [
    				listen_dev(div0, "mousemove", ctx.handleMousemove),
    				listen_dev(div1, "mousemove", ctx.mousemove_handler),
    				listen_dev(button, "click", handleButtonClick, { once: true })
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t2);
    			append_dev(div0, t3);
    			append_dev(div0, t4);
    			append_dev(div0, t5);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t7);
    			append_dev(div1, t8);
    			append_dev(div1, t9);
    			append_dev(div1, t10);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, button, anchor);
    			insert_dev(target, t13, anchor);
    			mount_component(outer, target, anchor);
    			insert_dev(target, t14, anchor);
    			mount_component(fancybutton, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.m) && t3_value !== (t3_value = ctx.m.x + "")) {
    				set_data_dev(t3, t3_value);
    			}

    			if ((!current || changed.m) && t5_value !== (t5_value = ctx.m.y + "")) {
    				set_data_dev(t5, t5_value);
    			}

    			if ((!current || changed.m) && t8_value !== (t8_value = ctx.m.x + "")) {
    				set_data_dev(t8, t8_value);
    			}

    			if ((!current || changed.m) && t10_value !== (t10_value = ctx.m.y + "")) {
    				set_data_dev(t10, t10_value);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(outer.$$.fragment, local);

    			transition_in(fancybutton.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(outer.$$.fragment, local);
    			transition_out(fancybutton.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h2);
    				detach_dev(t1);
    				detach_dev(div0);
    				detach_dev(t6);
    				detach_dev(div1);
    				detach_dev(t11);
    				detach_dev(button);
    				detach_dev(t13);
    			}

    			destroy_component(outer, detaching);

    			if (detaching) {
    				detach_dev(t14);
    			}

    			destroy_component(fancybutton, detaching);

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$e.name, type: "component", source: "", ctx });
    	return block;
    }

    function handleButtonClick() {
      alert("no more alerts");
    }

    function handleMessage(event) {
      alert(event.detail.text);
    }

    function handleClick() {
      alert("clicked");
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let m = { x: 0, y: 0 };

      function handleMousemove(event) {
        $$invalidate('m', m.x = event.clientX, m);
        $$invalidate('m', m.y = event.clientY, m);
      }

    	const mousemove_handler = (e) => ($$invalidate('m', m = { x: e.clientX, y: e.clientY }));

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('m' in $$props) $$invalidate('m', m = $$props.m);
    	};

    	return { m, handleMousemove, mousemove_handler };
    }

    class Events extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$e, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Events", options, id: create_fragment$e.name });
    	}
    }

    /* src/concepts/nested/Keypad.svelte generated by Svelte v3.12.1 */

    const file$e = "src/concepts/nested/Keypad.svelte";

    function create_fragment$f(ctx) {
    	var div, button0, t1, button1, t3, button2, t5, button3, t7, button4, t9, button5, t11, button6, t13, button7, t15, button8, t17, button9, t18, button9_disabled_value, t19, button10, t21, button11, t22, button11_disabled_value, dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "1";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "2";
    			t3 = space();
    			button2 = element("button");
    			button2.textContent = "3";
    			t5 = space();
    			button3 = element("button");
    			button3.textContent = "4";
    			t7 = space();
    			button4 = element("button");
    			button4.textContent = "5";
    			t9 = space();
    			button5 = element("button");
    			button5.textContent = "6";
    			t11 = space();
    			button6 = element("button");
    			button6.textContent = "7";
    			t13 = space();
    			button7 = element("button");
    			button7.textContent = "8";
    			t15 = space();
    			button8 = element("button");
    			button8.textContent = "9";
    			t17 = space();
    			button9 = element("button");
    			t18 = text("clear");
    			t19 = space();
    			button10 = element("button");
    			button10.textContent = "0";
    			t21 = space();
    			button11 = element("button");
    			t22 = text("submit");
    			attr_dev(button0, "class", "svelte-1uqqcw7");
    			add_location(button0, file$e, 26, 2, 478);
    			attr_dev(button1, "class", "svelte-1uqqcw7");
    			add_location(button1, file$e, 27, 2, 520);
    			attr_dev(button2, "class", "svelte-1uqqcw7");
    			add_location(button2, file$e, 28, 2, 562);
    			attr_dev(button3, "class", "svelte-1uqqcw7");
    			add_location(button3, file$e, 29, 2, 604);
    			attr_dev(button4, "class", "svelte-1uqqcw7");
    			add_location(button4, file$e, 30, 2, 646);
    			attr_dev(button5, "class", "svelte-1uqqcw7");
    			add_location(button5, file$e, 31, 2, 688);
    			attr_dev(button6, "class", "svelte-1uqqcw7");
    			add_location(button6, file$e, 32, 2, 730);
    			attr_dev(button7, "class", "svelte-1uqqcw7");
    			add_location(button7, file$e, 33, 2, 772);
    			attr_dev(button8, "class", "svelte-1uqqcw7");
    			add_location(button8, file$e, 34, 2, 814);
    			button9.disabled = button9_disabled_value = !ctx.value;
    			attr_dev(button9, "class", "svelte-1uqqcw7");
    			add_location(button9, file$e, 36, 2, 857);
    			attr_dev(button10, "class", "svelte-1uqqcw7");
    			add_location(button10, file$e, 37, 2, 917);
    			button11.disabled = button11_disabled_value = !ctx.value;
    			attr_dev(button11, "class", "svelte-1uqqcw7");
    			add_location(button11, file$e, 38, 2, 959);
    			attr_dev(div, "class", "keypad svelte-1uqqcw7");
    			add_location(div, file$e, 25, 0, 455);

    			dispose = [
    				listen_dev(button0, "click", ctx.select(1)),
    				listen_dev(button1, "click", ctx.select(2)),
    				listen_dev(button2, "click", ctx.select(3)),
    				listen_dev(button3, "click", ctx.select(4)),
    				listen_dev(button4, "click", ctx.select(5)),
    				listen_dev(button5, "click", ctx.select(6)),
    				listen_dev(button6, "click", ctx.select(7)),
    				listen_dev(button7, "click", ctx.select(8)),
    				listen_dev(button8, "click", ctx.select(9)),
    				listen_dev(button9, "click", ctx.clear),
    				listen_dev(button10, "click", ctx.select(0)),
    				listen_dev(button11, "click", ctx.submit)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(div, t1);
    			append_dev(div, button1);
    			append_dev(div, t3);
    			append_dev(div, button2);
    			append_dev(div, t5);
    			append_dev(div, button3);
    			append_dev(div, t7);
    			append_dev(div, button4);
    			append_dev(div, t9);
    			append_dev(div, button5);
    			append_dev(div, t11);
    			append_dev(div, button6);
    			append_dev(div, t13);
    			append_dev(div, button7);
    			append_dev(div, t15);
    			append_dev(div, button8);
    			append_dev(div, t17);
    			append_dev(div, button9);
    			append_dev(button9, t18);
    			append_dev(div, t19);
    			append_dev(div, button10);
    			append_dev(div, t21);
    			append_dev(div, button11);
    			append_dev(button11, t22);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.value) && button9_disabled_value !== (button9_disabled_value = !ctx.value)) {
    				prop_dev(button9, "disabled", button9_disabled_value);
    			}

    			if ((changed.value) && button11_disabled_value !== (button11_disabled_value = !ctx.value)) {
    				prop_dev(button11, "disabled", button11_disabled_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$f.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { value = "" } = $$props;

      const dispatch = createEventDispatcher();

      const select = num => () => ($$invalidate('value', value += num));
      const clear = () => ($$invalidate('value', value = ""));
      const submit = () => dispatch("submit");

    	const writable_props = ['value'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Keypad> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('value' in $$props) $$invalidate('value', value = $$props.value);
    	};

    	$$self.$capture_state = () => {
    		return { value };
    	};

    	$$self.$inject_state = $$props => {
    		if ('value' in $$props) $$invalidate('value', value = $$props.value);
    	};

    	return { value, select, clear, submit };
    }

    class Keypad extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$f, safe_not_equal, ["value"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Keypad", options, id: create_fragment$f.name });
    	}

    	get value() {
    		throw new Error("<Keypad>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Keypad>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/concepts/Bindings.svelte generated by Svelte v3.12.1 */

    const file$f = "src/concepts/Bindings.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.todo = list[i];
    	child_ctx.each_value = list;
    	child_ctx.todo_index = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.question = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.flavour = list[i];
    	return child_ctx;
    }

    // (109:0) {:else}
    function create_else_block_1(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "You must opt in to continue. If you're not paying, you're the product.";
    			add_location(p, file$f, 109, 2, 2313);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block_1.name, type: "else", source: "(109:0) {:else}", ctx });
    	return block;
    }

    // (107:0) {#if yes}
    function create_if_block_2(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Thank you. We will bombard your inbox and sell your personal details.";
    			add_location(p, file$f, 107, 2, 2226);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2.name, type: "if", source: "(107:0) {#if yes}", ctx });
    	return block;
    }

    // (134:0) {#each menu as flavour}
    function create_each_block_2(ctx) {
    	var label, input, t0, t1_value = ctx.flavour + "", t1, dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			t1 = text(t1_value);
    			ctx.$$binding_groups[0].push(input);
    			attr_dev(input, "type", "checkbox");
    			input.__value = ctx.flavour;
    			input.value = input.__value;
    			attr_dev(input, "class", "svelte-bu3g6a");
    			add_location(input, file$f, 135, 4, 2828);
    			add_location(label, file$f, 134, 2, 2816);
    			dispose = listen_dev(input, "change", ctx.input_change_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);

    			input.checked = ~ctx.flavours.indexOf(input.__value);

    			append_dev(label, t0);
    			append_dev(label, t1);
    		},

    		p: function update(changed, ctx) {
    			if (changed.flavours) input.checked = ~ctx.flavours.indexOf(input.__value);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(label);
    			}

    			ctx.$$binding_groups[0].splice(ctx.$$binding_groups[0].indexOf(input), 1);
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_2.name, type: "each", source: "(134:0) {#each menu as flavour}", ctx });
    	return block;
    }

    // (145:0) {:else}
    function create_else_block$1(ctx) {
    	var p, t0, t1, t2, t3_value = ctx.scoops === 1 ? 'scoop' : 'scoops' + "", t3, t4, t5_value = join(ctx.flavours) + "", t5;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("You ordered ");
    			t1 = text(ctx.scoops);
    			t2 = space();
    			t3 = text(t3_value);
    			t4 = text(" of ");
    			t5 = text(t5_value);
    			add_location(p, file$f, 145, 2, 3092);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(p, t3);
    			append_dev(p, t4);
    			append_dev(p, t5);
    		},

    		p: function update(changed, ctx) {
    			if (changed.scoops) {
    				set_data_dev(t1, ctx.scoops);
    			}

    			if ((changed.scoops) && t3_value !== (t3_value = ctx.scoops === 1 ? 'scoop' : 'scoops' + "")) {
    				set_data_dev(t3, t3_value);
    			}

    			if ((changed.flavours) && t5_value !== (t5_value = join(ctx.flavours) + "")) {
    				set_data_dev(t5, t5_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$1.name, type: "else", source: "(145:0) {:else}", ctx });
    	return block;
    }

    // (143:35) 
    function create_if_block_1(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Can't order more flavours than scoops!";
    			add_location(p, file$f, 143, 2, 3036);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(143:35) ", ctx });
    	return block;
    }

    // (141:0) {#if flavours.length === 0}
    function create_if_block$1(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Please select at least one flavour";
    			add_location(p, file$f, 141, 2, 2956);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(141:0) {#if flavours.length === 0}", ctx });
    	return block;
    }

    // (161:4) {#each questions as question}
    function create_each_block_1$1(ctx) {
    	var option, t_value = ctx.question.text + "", t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = ctx.question;
    			option.value = option.__value;
    			add_location(option, file$f, 161, 6, 3499);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(option);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_1$1.name, type: "each", source: "(161:4) {#each questions as question}", ctx });
    	return block;
    }

    // (185:0) {#each todos as todo}
    function create_each_block$1(ctx) {
    	var div, input0, t, input1, dispose;

    	function input0_change_handler() {
    		ctx.input0_change_handler.call(input0, ctx);
    	}

    	function input1_input_handler_1() {
    		ctx.input1_input_handler_1.call(input1, ctx);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			input0 = element("input");
    			t = space();
    			input1 = element("input");
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "class", "svelte-bu3g6a");
    			add_location(input0, file$f, 186, 4, 4047);
    			attr_dev(input1, "placeholder", "What needs to be done?");
    			attr_dev(input1, "class", "svelte-bu3g6a");
    			add_location(input1, file$f, 188, 4, 4103);
    			attr_dev(div, "class", "svelte-bu3g6a");
    			toggle_class(div, "done", ctx.todo.done);
    			add_location(div, file$f, 185, 2, 4014);

    			dispose = [
    				listen_dev(input0, "change", input0_change_handler),
    				listen_dev(input1, "input", input1_input_handler_1)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input0);

    			input0.checked = ctx.todo.done;

    			append_dev(div, t);
    			append_dev(div, input1);

    			set_input_value(input1, ctx.todo.text);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if (changed.todos) input0.checked = ctx.todo.done;
    			if (changed.todos && (input1.value !== ctx.todo.text)) set_input_value(input1, ctx.todo.text);

    			if (changed.todos) {
    				toggle_class(div, "done", ctx.todo.done);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$1.name, type: "each", source: "(185:0) {#each todos as todo}", ctx });
    	return block;
    }

    function create_fragment$g(ctx) {
    	var h2, t1, input0, t2, h30, t3, t4, t5, t6, label0, input1, input1_updating = false, t7, input2, t8, label1, input3, input3_updating = false, t9, input4, t10, p0, t11, t12, t13, t14, t15_value = ctx.a + ctx.b + "", t15, t16, label2, input5, t17, t18, t19, button0, t20, button0_disabled_value, t21, h31, t23, label3, input6, t24, t25, label4, input7, t26, t27, label5, input8, t28, t29, h32, t31, t32, t33, textarea, t34, html_tag, t35, h33, t37, form, select, t38, input9, t39, button1, t40, button1_disabled_value, t41, p1, t42, t43_value = ctx.selected ? ctx.selected.id : '[waiting...]' + "", t43, t44, h34, t46, t47, p2, t48, t49, t50, button2, t52, button3, t54, h35, t55, t56, updating_value, current, dispose;

    	function input1_input_handler() {
    		input1_updating = true;
    		ctx.input1_input_handler.call(input1);
    	}

    	function input3_input_handler() {
    		input3_updating = true;
    		ctx.input3_input_handler.call(input3);
    	}

    	function select_block_type(changed, ctx) {
    		if (ctx.yes) return create_if_block_2;
    		return create_else_block_1;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block0 = current_block_type(ctx);

    	let each_value_2 = ctx.menu;

    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	function select_block_type_1(changed, ctx) {
    		if (ctx.flavours.length === 0) return create_if_block$1;
    		if (ctx.flavours.length > ctx.scoops) return create_if_block_1;
    		return create_else_block$1;
    	}

    	var current_block_type_1 = select_block_type_1(null, ctx);
    	var if_block1 = current_block_type_1(ctx);

    	let each_value_1 = ctx.questions;

    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	let each_value = ctx.todos;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	function keypad_value_binding(value_1) {
    		ctx.keypad_value_binding.call(null, value_1);
    		updating_value = true;
    		add_flush_callback(() => updating_value = false);
    	}

    	let keypad_props = {};
    	if (ctx.pin !== void 0) {
    		keypad_props.value = ctx.pin;
    	}
    	var keypad = new Keypad({ props: keypad_props, $$inline: true });

    	binding_callbacks.push(() => bind(keypad, 'value', keypad_value_binding));
    	keypad.$on("submit", ctx.handlePinSubmit);

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Bindings";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			h30 = element("h3");
    			t3 = text("Hello ");
    			t4 = text(ctx.name);
    			t5 = text("!");
    			t6 = space();
    			label0 = element("label");
    			input1 = element("input");
    			t7 = space();
    			input2 = element("input");
    			t8 = space();
    			label1 = element("label");
    			input3 = element("input");
    			t9 = space();
    			input4 = element("input");
    			t10 = space();
    			p0 = element("p");
    			t11 = text(ctx.a);
    			t12 = text(" + ");
    			t13 = text(ctx.b);
    			t14 = text(" = ");
    			t15 = text(t15_value);
    			t16 = space();
    			label2 = element("label");
    			input5 = element("input");
    			t17 = text("\n  Yes! Send me regular email spam");
    			t18 = space();
    			if_block0.c();
    			t19 = space();
    			button0 = element("button");
    			t20 = text("Subscribe");
    			t21 = space();
    			h31 = element("h3");
    			h31.textContent = "Size";
    			t23 = space();
    			label3 = element("label");
    			input6 = element("input");
    			t24 = text("\n  One scoop");
    			t25 = space();
    			label4 = element("label");
    			input7 = element("input");
    			t26 = text("\n  Two scoops");
    			t27 = space();
    			label5 = element("label");
    			input8 = element("input");
    			t28 = text("\n  Three scoops");
    			t29 = space();
    			h32 = element("h3");
    			h32.textContent = "Flavours";
    			t31 = space();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t32 = space();
    			if_block1.c();
    			t33 = space();
    			textarea = element("textarea");
    			t34 = space();
    			t35 = space();
    			h33 = element("h3");
    			h33.textContent = "Insecurity questions";
    			t37 = space();
    			form = element("form");
    			select = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t38 = space();
    			input9 = element("input");
    			t39 = space();
    			button1 = element("button");
    			t40 = text("Submit");
    			t41 = space();
    			p1 = element("p");
    			t42 = text("selected question ");
    			t43 = text(t43_value);
    			t44 = space();
    			h34 = element("h3");
    			h34.textContent = "Todos";
    			t46 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t47 = space();
    			p2 = element("p");
    			t48 = text(ctx.remaining);
    			t49 = text(" remaining");
    			t50 = space();
    			button2 = element("button");
    			button2.textContent = "Add new";
    			t52 = space();
    			button3 = element("button");
    			button3.textContent = "Clear completed";
    			t54 = space();
    			h35 = element("h3");
    			t55 = text(ctx.view);
    			t56 = space();
    			keypad.$$.fragment.c();
    			add_location(h2, file$f, 83, 0, 1607);
    			attr_dev(input0, "class", "svelte-bu3g6a");
    			add_location(input0, file$f, 84, 0, 1625);
    			add_location(h30, file$f, 85, 0, 1653);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "10");
    			attr_dev(input1, "class", "svelte-bu3g6a");
    			add_location(input1, file$f, 89, 2, 1766);
    			attr_dev(input2, "type", "range");
    			attr_dev(input2, "min", "0");
    			attr_dev(input2, "max", "10");
    			attr_dev(input2, "class", "svelte-bu3g6a");
    			add_location(input2, file$f, 90, 2, 1824);
    			add_location(label0, file$f, 88, 0, 1756);
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "min", "0");
    			attr_dev(input3, "max", "10");
    			attr_dev(input3, "class", "svelte-bu3g6a");
    			add_location(input3, file$f, 94, 2, 1899);
    			attr_dev(input4, "type", "range");
    			attr_dev(input4, "min", "0");
    			attr_dev(input4, "max", "10");
    			attr_dev(input4, "class", "svelte-bu3g6a");
    			add_location(input4, file$f, 95, 2, 1957);
    			add_location(label1, file$f, 93, 0, 1889);
    			add_location(p0, file$f, 98, 0, 2022);
    			attr_dev(input5, "type", "checkbox");
    			attr_dev(input5, "class", "svelte-bu3g6a");
    			add_location(input5, file$f, 102, 2, 2125);
    			add_location(label2, file$f, 101, 0, 2115);
    			button0.disabled = button0_disabled_value = !ctx.yes;
    			add_location(button0, file$f, 112, 0, 2398);
    			add_location(h31, file$f, 115, 0, 2498);
    			ctx.$$binding_groups[1].push(input6);
    			attr_dev(input6, "type", "radio");
    			input6.__value = 1;
    			input6.value = input6.__value;
    			attr_dev(input6, "class", "svelte-bu3g6a");
    			add_location(input6, file$f, 118, 2, 2523);
    			add_location(label3, file$f, 117, 0, 2513);
    			ctx.$$binding_groups[1].push(input7);
    			attr_dev(input7, "type", "radio");
    			input7.__value = 2;
    			input7.value = input7.__value;
    			attr_dev(input7, "class", "svelte-bu3g6a");
    			add_location(input7, file$f, 123, 2, 2608);
    			add_location(label4, file$f, 122, 0, 2598);
    			ctx.$$binding_groups[1].push(input8);
    			attr_dev(input8, "type", "radio");
    			input8.__value = 3;
    			input8.value = input8.__value;
    			attr_dev(input8, "class", "svelte-bu3g6a");
    			add_location(input8, file$f, 128, 2, 2694);
    			add_location(label5, file$f, 127, 0, 2684);
    			add_location(h32, file$f, 132, 0, 2772);
    			attr_dev(textarea, "class", "svelte-bu3g6a");
    			add_location(textarea, file$f, 151, 0, 3227);
    			html_tag = new HtmlTag(ctx.value, t35);
    			add_location(h33, file$f, 156, 0, 3316);
    			if (ctx.selected === void 0) add_render_callback(() => ctx.select_change_handler.call(select));
    			add_location(select, file$f, 159, 2, 3396);
    			attr_dev(input9, "class", "svelte-bu3g6a");
    			add_location(input9, file$f, 165, 2, 3576);
    			button1.disabled = button1_disabled_value = !ctx.answer;
    			attr_dev(button1, "type", "submit");
    			add_location(button1, file$f, 167, 2, 3609);
    			add_location(form, file$f, 158, 0, 3347);
    			add_location(p1, file$f, 170, 0, 3675);
    			add_location(h34, file$f, 182, 0, 3974);
    			add_location(p2, file$f, 192, 0, 4191);
    			add_location(button2, file$f, 194, 0, 4221);
    			add_location(button3, file$f, 196, 0, 4262);
    			set_style(h35, "color", (ctx.pin ? '#333' : '#ccc'));
    			add_location(h35, file$f, 199, 0, 4353);

    			dispose = [
    				listen_dev(input0, "input", ctx.input0_input_handler),
    				listen_dev(input1, "input", input1_input_handler),
    				listen_dev(input2, "change", ctx.input2_change_input_handler),
    				listen_dev(input2, "input", ctx.input2_change_input_handler),
    				listen_dev(input3, "input", input3_input_handler),
    				listen_dev(input4, "change", ctx.input4_change_input_handler),
    				listen_dev(input4, "input", ctx.input4_change_input_handler),
    				listen_dev(input5, "change", ctx.input5_change_handler),
    				listen_dev(input6, "change", ctx.input6_change_handler),
    				listen_dev(input7, "change", ctx.input7_change_handler),
    				listen_dev(input8, "change", ctx.input8_change_handler),
    				listen_dev(textarea, "input", ctx.textarea_input_handler),
    				listen_dev(select, "change", ctx.select_change_handler),
    				listen_dev(select, "change", ctx.change_handler),
    				listen_dev(input9, "input", ctx.input9_input_handler),
    				listen_dev(form, "submit", prevent_default(ctx.handleSubmit), false, true),
    				listen_dev(button2, "click", ctx.add),
    				listen_dev(button3, "click", ctx.clear)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input0, anchor);

    			set_input_value(input0, ctx.name);

    			insert_dev(target, t2, anchor);
    			insert_dev(target, h30, anchor);
    			append_dev(h30, t3);
    			append_dev(h30, t4);
    			append_dev(h30, t5);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, label0, anchor);
    			append_dev(label0, input1);

    			set_input_value(input1, ctx.a);

    			append_dev(label0, t7);
    			append_dev(label0, input2);

    			set_input_value(input2, ctx.a);

    			insert_dev(target, t8, anchor);
    			insert_dev(target, label1, anchor);
    			append_dev(label1, input3);

    			set_input_value(input3, ctx.b);

    			append_dev(label1, t9);
    			append_dev(label1, input4);

    			set_input_value(input4, ctx.b);

    			insert_dev(target, t10, anchor);
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t11);
    			append_dev(p0, t12);
    			append_dev(p0, t13);
    			append_dev(p0, t14);
    			append_dev(p0, t15);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, label2, anchor);
    			append_dev(label2, input5);

    			input5.checked = ctx.yes;

    			append_dev(label2, t17);
    			insert_dev(target, t18, anchor);
    			if_block0.m(target, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, button0, anchor);
    			append_dev(button0, t20);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, h31, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, label3, anchor);
    			append_dev(label3, input6);

    			input6.checked = input6.__value === ctx.scoops;

    			append_dev(label3, t24);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, label4, anchor);
    			append_dev(label4, input7);

    			input7.checked = input7.__value === ctx.scoops;

    			append_dev(label4, t26);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, label5, anchor);
    			append_dev(label5, input8);

    			input8.checked = input8.__value === ctx.scoops;

    			append_dev(label5, t28);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, h32, anchor);
    			insert_dev(target, t31, anchor);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(target, anchor);
    			}

    			insert_dev(target, t32, anchor);
    			if_block1.m(target, anchor);
    			insert_dev(target, t33, anchor);
    			insert_dev(target, textarea, anchor);

    			set_input_value(textarea, ctx.value);

    			insert_dev(target, t34, anchor);
    			html_tag.m(target, anchor);
    			insert_dev(target, t35, anchor);
    			insert_dev(target, h33, anchor);
    			insert_dev(target, t37, anchor);
    			insert_dev(target, form, anchor);
    			append_dev(form, select);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(select, null);
    			}

    			select_option(select, ctx.selected);

    			append_dev(form, t38);
    			append_dev(form, input9);

    			set_input_value(input9, ctx.answer);

    			append_dev(form, t39);
    			append_dev(form, button1);
    			append_dev(button1, t40);
    			insert_dev(target, t41, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t42);
    			append_dev(p1, t43);
    			insert_dev(target, t44, anchor);
    			insert_dev(target, h34, anchor);
    			insert_dev(target, t46, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t47, anchor);
    			insert_dev(target, p2, anchor);
    			append_dev(p2, t48);
    			append_dev(p2, t49);
    			insert_dev(target, t50, anchor);
    			insert_dev(target, button2, anchor);
    			insert_dev(target, t52, anchor);
    			insert_dev(target, button3, anchor);
    			insert_dev(target, t54, anchor);
    			insert_dev(target, h35, anchor);
    			append_dev(h35, t55);
    			insert_dev(target, t56, anchor);
    			mount_component(keypad, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.name && (input0.value !== ctx.name)) set_input_value(input0, ctx.name);

    			if (!current || changed.name) {
    				set_data_dev(t4, ctx.name);
    			}

    			if (!input1_updating && changed.a) set_input_value(input1, ctx.a);
    			input1_updating = false;
    			if (changed.a) set_input_value(input2, ctx.a);
    			if (!input3_updating && changed.b) set_input_value(input3, ctx.b);
    			input3_updating = false;
    			if (changed.b) set_input_value(input4, ctx.b);

    			if (!current || changed.a) {
    				set_data_dev(t11, ctx.a);
    			}

    			if (!current || changed.b) {
    				set_data_dev(t13, ctx.b);
    			}

    			if ((!current || changed.a || changed.b) && t15_value !== (t15_value = ctx.a + ctx.b + "")) {
    				set_data_dev(t15, t15_value);
    			}

    			if (changed.yes) input5.checked = ctx.yes;

    			if (current_block_type !== (current_block_type = select_block_type(changed, ctx))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);
    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(t19.parentNode, t19);
    				}
    			}

    			if ((!current || changed.yes) && button0_disabled_value !== (button0_disabled_value = !ctx.yes)) {
    				prop_dev(button0, "disabled", button0_disabled_value);
    			}

    			if (changed.scoops) input6.checked = input6.__value === ctx.scoops;
    			if (changed.scoops) input7.checked = input7.__value === ctx.scoops;
    			if (changed.scoops) input8.checked = input8.__value === ctx.scoops;

    			if (changed.menu || changed.flavours) {
    				each_value_2 = ctx.menu;

    				let i;
    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(changed, child_ctx);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(t32.parentNode, t32);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}
    				each_blocks_2.length = each_value_2.length;
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(changed, ctx)) && if_block1) {
    				if_block1.p(changed, ctx);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);
    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(t33.parentNode, t33);
    				}
    			}

    			if (changed.value) set_input_value(textarea, ctx.value);

    			if (!current || changed.value) {
    				html_tag.p(ctx.value);
    			}

    			if (changed.questions) {
    				each_value_1 = ctx.questions;

    				let i;
    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(changed, child_ctx);
    					} else {
    						each_blocks_1[i] = create_each_block_1$1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}
    				each_blocks_1.length = each_value_1.length;
    			}

    			if (changed.selected) select_option(select, ctx.selected);
    			if (changed.answer && (input9.value !== ctx.answer)) set_input_value(input9, ctx.answer);

    			if ((!current || changed.answer) && button1_disabled_value !== (button1_disabled_value = !ctx.answer)) {
    				prop_dev(button1, "disabled", button1_disabled_value);
    			}

    			if ((!current || changed.selected) && t43_value !== (t43_value = ctx.selected ? ctx.selected.id : '[waiting...]' + "")) {
    				set_data_dev(t43, t43_value);
    			}

    			if (changed.todos) {
    				each_value = ctx.todos;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(t47.parentNode, t47);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}

    			if (!current || changed.remaining) {
    				set_data_dev(t48, ctx.remaining);
    			}

    			if (!current || changed.view) {
    				set_data_dev(t55, ctx.view);
    			}

    			if (!current || changed.pin) {
    				set_style(h35, "color", (ctx.pin ? '#333' : '#ccc'));
    			}

    			var keypad_changes = {};
    			if (!updating_value && changed.pin) {
    				keypad_changes.value = ctx.pin;
    			}
    			keypad.$set(keypad_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(keypad.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(keypad.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h2);
    				detach_dev(t1);
    				detach_dev(input0);
    				detach_dev(t2);
    				detach_dev(h30);
    				detach_dev(t6);
    				detach_dev(label0);
    				detach_dev(t8);
    				detach_dev(label1);
    				detach_dev(t10);
    				detach_dev(p0);
    				detach_dev(t16);
    				detach_dev(label2);
    				detach_dev(t18);
    			}

    			if_block0.d(detaching);

    			if (detaching) {
    				detach_dev(t19);
    				detach_dev(button0);
    				detach_dev(t21);
    				detach_dev(h31);
    				detach_dev(t23);
    				detach_dev(label3);
    			}

    			ctx.$$binding_groups[1].splice(ctx.$$binding_groups[1].indexOf(input6), 1);

    			if (detaching) {
    				detach_dev(t25);
    				detach_dev(label4);
    			}

    			ctx.$$binding_groups[1].splice(ctx.$$binding_groups[1].indexOf(input7), 1);

    			if (detaching) {
    				detach_dev(t27);
    				detach_dev(label5);
    			}

    			ctx.$$binding_groups[1].splice(ctx.$$binding_groups[1].indexOf(input8), 1);

    			if (detaching) {
    				detach_dev(t29);
    				detach_dev(h32);
    				detach_dev(t31);
    			}

    			destroy_each(each_blocks_2, detaching);

    			if (detaching) {
    				detach_dev(t32);
    			}

    			if_block1.d(detaching);

    			if (detaching) {
    				detach_dev(t33);
    				detach_dev(textarea);
    				detach_dev(t34);
    				html_tag.d();
    				detach_dev(t35);
    				detach_dev(h33);
    				detach_dev(t37);
    				detach_dev(form);
    			}

    			destroy_each(each_blocks_1, detaching);

    			if (detaching) {
    				detach_dev(t41);
    				detach_dev(p1);
    				detach_dev(t44);
    				detach_dev(h34);
    				detach_dev(t46);
    			}

    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(t47);
    				detach_dev(p2);
    				detach_dev(t50);
    				detach_dev(button2);
    				detach_dev(t52);
    				detach_dev(button3);
    				detach_dev(t54);
    				detach_dev(h35);
    				detach_dev(t56);
    			}

    			destroy_component(keypad, detaching);

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$g.name, type: "component", source: "", ctx });
    	return block;
    }

    function join(flavours) {
      if (flavours.length === 1) return flavours[0];
      return `${flavours.slice(0, -1).join(", ")} and ${
    flavours[flavours.length - 1]
  }`;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let name = "world";

      let a = 1;
      let b = 2;

      let yes = false;

      let scoops = 1;
      let flavours = ["Mint choc chip"];
      let menu = ["Cookies and cream", "Mint choc chip", "Raspberry ripple"];

      let value = `Some words are *italic*, some are **bold**`;

      let questions = [
        { id: 1, text: `Where did you go to school?` },
        { id: 2, text: `What is your mother's name?` },
        {
          id: 3,
          text: `What is another personal fact that an attacker could easily find with Google?`
        }
      ];

      let selected;

      let answer = "";

      function handleSubmit() {
        alert(
          `answered question ${selected.id} (${selected.text}) with "${answer}"`
        );
      }

      let todos = [
        { done: false, text: "finish Svelte tutorial" },
        { done: false, text: "build an app" },
        { done: false, text: "world domination" }
      ];

      function add() {
        $$invalidate('todos', todos = todos.concat({ done: false, text: "" }));
      }

      function clear() {
        $$invalidate('todos', todos = todos.filter(t => !t.done));
      }

      let pin;

      function handlePinSubmit() {
        alert(`submitted ${pin}`);
      }

    	const $$binding_groups = [[], []];

    	function input0_input_handler() {
    		name = this.value;
    		$$invalidate('name', name);
    	}

    	function input1_input_handler() {
    		a = to_number(this.value);
    		$$invalidate('a', a);
    	}

    	function input2_change_input_handler() {
    		a = to_number(this.value);
    		$$invalidate('a', a);
    	}

    	function input3_input_handler() {
    		b = to_number(this.value);
    		$$invalidate('b', b);
    	}

    	function input4_change_input_handler() {
    		b = to_number(this.value);
    		$$invalidate('b', b);
    	}

    	function input5_change_handler() {
    		yes = this.checked;
    		$$invalidate('yes', yes);
    	}

    	function input6_change_handler() {
    		scoops = this.__value;
    		$$invalidate('scoops', scoops);
    	}

    	function input7_change_handler() {
    		scoops = this.__value;
    		$$invalidate('scoops', scoops);
    	}

    	function input8_change_handler() {
    		scoops = this.__value;
    		$$invalidate('scoops', scoops);
    	}

    	function input_change_handler() {
    		flavours = get_binding_group_value($$binding_groups[0]);
    		$$invalidate('flavours', flavours);
    	}

    	function textarea_input_handler() {
    		value = this.value;
    		$$invalidate('value', value);
    	}

    	function select_change_handler() {
    		selected = select_value(this);
    		$$invalidate('selected', selected);
    		$$invalidate('questions', questions);
    	}

    	const change_handler = () => ($$invalidate('answer', answer = ''));

    	function input9_input_handler() {
    		answer = this.value;
    		$$invalidate('answer', answer);
    	}

    	function input0_change_handler({ todo, each_value, todo_index }) {
    		each_value[todo_index].done = this.checked;
    		$$invalidate('todos', todos);
    	}

    	function input1_input_handler_1({ todo, each_value, todo_index }) {
    		each_value[todo_index].text = this.value;
    		$$invalidate('todos', todos);
    	}

    	function keypad_value_binding(value_1) {
    		pin = value_1;
    		$$invalidate('pin', pin);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('a' in $$props) $$invalidate('a', a = $$props.a);
    		if ('b' in $$props) $$invalidate('b', b = $$props.b);
    		if ('yes' in $$props) $$invalidate('yes', yes = $$props.yes);
    		if ('scoops' in $$props) $$invalidate('scoops', scoops = $$props.scoops);
    		if ('flavours' in $$props) $$invalidate('flavours', flavours = $$props.flavours);
    		if ('menu' in $$props) $$invalidate('menu', menu = $$props.menu);
    		if ('value' in $$props) $$invalidate('value', value = $$props.value);
    		if ('questions' in $$props) $$invalidate('questions', questions = $$props.questions);
    		if ('selected' in $$props) $$invalidate('selected', selected = $$props.selected);
    		if ('answer' in $$props) $$invalidate('answer', answer = $$props.answer);
    		if ('todos' in $$props) $$invalidate('todos', todos = $$props.todos);
    		if ('pin' in $$props) $$invalidate('pin', pin = $$props.pin);
    		if ('remaining' in $$props) $$invalidate('remaining', remaining = $$props.remaining);
    		if ('view' in $$props) $$invalidate('view', view = $$props.view);
    	};

    	let remaining, view;

    	$$self.$$.update = ($$dirty = { todos: 1, pin: 1 }) => {
    		if ($$dirty.todos) { $$invalidate('remaining', remaining = todos.filter(t => !t.done).length); }
    		if ($$dirty.pin) { $$invalidate('view', view = pin ? pin.replace(/\d(?!$)/g, "•") : "enter your pin"); }
    	};

    	return {
    		name,
    		a,
    		b,
    		yes,
    		scoops,
    		flavours,
    		menu,
    		value,
    		questions,
    		selected,
    		answer,
    		handleSubmit,
    		todos,
    		add,
    		clear,
    		pin,
    		handlePinSubmit,
    		remaining,
    		view,
    		input0_input_handler,
    		input1_input_handler,
    		input2_change_input_handler,
    		input3_input_handler,
    		input4_change_input_handler,
    		input5_change_handler,
    		input6_change_handler,
    		input7_change_handler,
    		input8_change_handler,
    		input_change_handler,
    		textarea_input_handler,
    		select_change_handler,
    		change_handler,
    		input9_input_handler,
    		input0_change_handler,
    		input1_input_handler_1,
    		keypad_value_binding,
    		$$binding_groups
    	};
    }

    class Bindings extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$g, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Bindings", options, id: create_fragment$g.name });
    	}
    }

    /* src/concepts/Lifecycle.svelte generated by Svelte v3.12.1 */

    const file$g = "src/concepts/Lifecycle.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.photo = list[i];
    	return child_ctx;
    }

    // (47:2) {:else}
    function create_else_block$2(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "loading...";
    			add_location(p, file$g, 48, 4, 979);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$2.name, type: "else", source: "(47:2) {:else}", ctx });
    	return block;
    }

    // (42:2) {#each photos as photo}
    function create_each_block$2(ctx) {
    	var figure, img, img_src_value, img_alt_value, t0, figcaption, t1_value = ctx.photo.title + "", t1, t2;

    	const block = {
    		c: function create() {
    			figure = element("figure");
    			img = element("img");
    			t0 = space();
    			figcaption = element("figcaption");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(img, "src", img_src_value = ctx.photo.thumbnailUrl);
    			attr_dev(img, "alt", img_alt_value = ctx.photo.title);
    			attr_dev(img, "class", "svelte-1xibmtz");
    			add_location(img, file$g, 43, 6, 798);
    			add_location(figcaption, file$g, 44, 6, 855);
    			attr_dev(figure, "class", "svelte-1xibmtz");
    			add_location(figure, file$g, 42, 4, 783);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, figure, anchor);
    			append_dev(figure, img);
    			append_dev(figure, t0);
    			append_dev(figure, figcaption);
    			append_dev(figcaption, t1);
    			append_dev(figure, t2);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.photos) && img_src_value !== (img_src_value = ctx.photo.thumbnailUrl)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if ((changed.photos) && img_alt_value !== (img_alt_value = ctx.photo.title)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if ((changed.photos) && t1_value !== (t1_value = ctx.photo.title + "")) {
    				set_data_dev(t1, t1_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(figure);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$2.name, type: "each", source: "(42:2) {#each photos as photo}", ctx });
    	return block;
    }

    function create_fragment$h(ctx) {
    	var h20, t1, div0, t3, h1, t5, div1, t6, h21, t8, div2, t10, p, t11, t12, t13, t14_value = ctx.seconds === 1 ? 'second' : 'seconds' + "", t14, t15, h22, t17, div3, t19, div4;

    	let each_value = ctx.photos;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block$2(ctx);
    		each_1_else.c();
    	}

    	const block = {
    		c: function create() {
    			h20 = element("h2");
    			h20.textContent = "On Mount";
    			t1 = space();
    			div0 = element("div");
    			div0.textContent = "Runs after the component is first rendered in the DOM";
    			t3 = space();
    			h1 = element("h1");
    			h1.textContent = "Photo album";
    			t5 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			h21 = element("h2");
    			h21.textContent = "On Destroy";
    			t8 = space();
    			div2 = element("div");
    			div2.textContent = "Runs when component is destroyed";
    			t10 = space();
    			p = element("p");
    			t11 = text("The page has been open for ");
    			t12 = text(ctx.seconds);
    			t13 = space();
    			t14 = text(t14_value);
    			t15 = space();
    			h22 = element("h2");
    			h22.textContent = "Before Update & After Update";
    			t17 = space();
    			div3 = element("div");
    			div3.textContent = "Before Update runs immediately before the DOM is updated - don't forget to\n  check to make sure the DOM element exists!";
    			t19 = space();
    			div4 = element("div");
    			div4.textContent = "After Update runs once the DOM has been updated with the new data";
    			add_location(h20, file$g, 36, 0, 627);
    			add_location(div0, file$g, 37, 0, 645);
    			add_location(h1, file$g, 38, 0, 710);
    			attr_dev(div1, "class", "photos svelte-1xibmtz");
    			add_location(div1, file$g, 40, 0, 732);
    			add_location(h21, file$g, 52, 0, 1015);
    			add_location(div2, file$g, 53, 0, 1035);
    			add_location(p, file$g, 55, 0, 1080);
    			add_location(h22, file$g, 59, 0, 1168);
    			add_location(div3, file$g, 60, 0, 1206);
    			add_location(div4, file$g, 64, 0, 1341);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			if (each_1_else) {
    				each_1_else.m(div1, null);
    			}

    			insert_dev(target, t6, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div2, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t11);
    			append_dev(p, t12);
    			append_dev(p, t13);
    			append_dev(p, t14);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, h22, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, div3, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, div4, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.photos) {
    				each_value = ctx.photos;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}

    			if (each_value.length) {
    				if (each_1_else) {
    					each_1_else.d(1);
    					each_1_else = null;
    				}
    			} else if (!each_1_else) {
    				each_1_else = create_else_block$2(ctx);
    				each_1_else.c();
    				each_1_else.m(div1, null);
    			}

    			if (changed.seconds) {
    				set_data_dev(t12, ctx.seconds);
    			}

    			if ((changed.seconds) && t14_value !== (t14_value = ctx.seconds === 1 ? 'second' : 'seconds' + "")) {
    				set_data_dev(t14, t14_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h20);
    				detach_dev(t1);
    				detach_dev(div0);
    				detach_dev(t3);
    				detach_dev(h1);
    				detach_dev(t5);
    				detach_dev(div1);
    			}

    			destroy_each(each_blocks, detaching);

    			if (each_1_else) each_1_else.d();

    			if (detaching) {
    				detach_dev(t6);
    				detach_dev(h21);
    				detach_dev(t8);
    				detach_dev(div2);
    				detach_dev(t10);
    				detach_dev(p);
    				detach_dev(t15);
    				detach_dev(h22);
    				detach_dev(t17);
    				detach_dev(div3);
    				detach_dev(t19);
    				detach_dev(div4);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$h.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let photos = [];

      //recommended to put fetch in onMount
      onMount(async () => {
        const res = await fetch(
          `https://jsonplaceholder.typicode.com/photos?_limit=20`
        );
        $$invalidate('photos', photos = await res.json());
      });

      let seconds = 0;
      const interval = setInterval(() => ($$invalidate('seconds', seconds += 1)), 1000);

      onDestroy(() => clearInterval(interval));

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('photos' in $$props) $$invalidate('photos', photos = $$props.photos);
    		if ('seconds' in $$props) $$invalidate('seconds', seconds = $$props.seconds);
    	};

    	return { photos, seconds };
    }

    class Lifecycle extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$h, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Lifecycle", options, id: create_fragment$h.name });
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    /**
     * Derived value store by synchronizing one or more readable stores and
     * applying an aggregation function over its input values.
     * @param {Stores} stores input stores
     * @param {function(Stores=, function(*)=):*}fn function callback that aggregates the values
     * @param {*=}initial_value when used asynchronously
     */
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    // export const count = writable(0);
    function createCount() {
      const { subscribe, set, update } = writable(0);

      return {
        subscribe,
        increment: () => update(n => n + 1),
        decrement: () => update(n => n - 1),
        reset: () => set(0)
      };
    }

    const count = createCount();

    const time = readable(new Date(), function start(set) {
      const interval = setInterval(() => {
        set(new Date());
      }, 1000);

      return function stop() {
        clearInterval(interval);
      };
    });

    const start = new Date();

    const elapsed = derived(time, $time =>
      Math.round(($time - start) / 1000)
    );

    const name = writable("world");

    const greeting = derived(name, $name => `Hello ${$name}!`);

    /* src/concepts/Stores.svelte generated by Svelte v3.12.1 */

    const file$h = "src/concepts/Stores.svelte";

    function create_fragment$i(ctx) {
    	var h2, t1, h30, t3, h10, t4, t5, t6, button0, t8, button1, t10, button2, t12, h31, t14, h11, t15, t16_value = ctx.formatter.format(ctx.$time) + "", t16, t17, h32, t19, p, t20, t21, t22, t23_value = ctx.$elapsed === 1 ? 'second' : 'seconds' + "", t23, t24, h33, t26, h4, t27, t28, input, t29, button3, dispose;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Stores";
    			t1 = space();
    			h30 = element("h3");
    			h30.textContent = "Writable stores example";
    			t3 = space();
    			h10 = element("h1");
    			t4 = text("The count is ");
    			t5 = text(ctx.$count);
    			t6 = space();
    			button0 = element("button");
    			button0.textContent = "+";
    			t8 = space();
    			button1 = element("button");
    			button1.textContent = "-";
    			t10 = space();
    			button2 = element("button");
    			button2.textContent = "reset";
    			t12 = space();
    			h31 = element("h3");
    			h31.textContent = "Readable stores example";
    			t14 = space();
    			h11 = element("h1");
    			t15 = text("The time is ");
    			t16 = text(t16_value);
    			t17 = space();
    			h32 = element("h3");
    			h32.textContent = "Derived stores";
    			t19 = space();
    			p = element("p");
    			t20 = text("This page has been open for ");
    			t21 = text(ctx.$elapsed);
    			t22 = space();
    			t23 = text(t23_value);
    			t24 = space();
    			h33 = element("h3");
    			h33.textContent = "Store bindings";
    			t26 = space();
    			h4 = element("h4");
    			t27 = text(ctx.$greeting);
    			t28 = space();
    			input = element("input");
    			t29 = space();
    			button3 = element("button");
    			button3.textContent = "Add exclamation mark!";
    			add_location(h2, file$h, 20, 0, 518);
    			add_location(h30, file$h, 21, 0, 534);
    			add_location(h10, file$h, 23, 0, 664);
    			add_location(button0, file$h, 24, 0, 695);
    			add_location(button1, file$h, 25, 0, 741);
    			add_location(button2, file$h, 26, 0, 787);
    			add_location(h31, file$h, 31, 0, 888);
    			add_location(h11, file$h, 32, 0, 921);
    			add_location(h32, file$h, 34, 0, 969);
    			add_location(p, file$h, 35, 0, 993);
    			add_location(h33, file$h, 39, 0, 1084);
    			add_location(h4, file$h, 40, 0, 1108);
    			add_location(input, file$h, 41, 0, 1129);
    			add_location(button3, file$h, 43, 0, 1159);

    			dispose = [
    				listen_dev(button0, "click", count.increment),
    				listen_dev(button1, "click", count.decrement),
    				listen_dev(button2, "click", count.reset),
    				listen_dev(input, "input", ctx.input_input_handler),
    				listen_dev(button3, "click", ctx.click_handler)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h30, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h10, anchor);
    			append_dev(h10, t4);
    			append_dev(h10, t5);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, button2, anchor);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, h31, anchor);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, h11, anchor);
    			append_dev(h11, t15);
    			append_dev(h11, t16);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, h32, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t20);
    			append_dev(p, t21);
    			append_dev(p, t22);
    			append_dev(p, t23);
    			insert_dev(target, t24, anchor);
    			insert_dev(target, h33, anchor);
    			insert_dev(target, t26, anchor);
    			insert_dev(target, h4, anchor);
    			append_dev(h4, t27);
    			insert_dev(target, t28, anchor);
    			insert_dev(target, input, anchor);

    			set_input_value(input, ctx.$name);

    			insert_dev(target, t29, anchor);
    			insert_dev(target, button3, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.$count) {
    				set_data_dev(t5, ctx.$count);
    			}

    			if ((changed.$time) && t16_value !== (t16_value = ctx.formatter.format(ctx.$time) + "")) {
    				set_data_dev(t16, t16_value);
    			}

    			if (changed.$elapsed) {
    				set_data_dev(t21, ctx.$elapsed);
    			}

    			if ((changed.$elapsed) && t23_value !== (t23_value = ctx.$elapsed === 1 ? 'second' : 'seconds' + "")) {
    				set_data_dev(t23, t23_value);
    			}

    			if (changed.$greeting) {
    				set_data_dev(t27, ctx.$greeting);
    			}

    			if (changed.$name && (input.value !== ctx.$name)) set_input_value(input, ctx.$name);
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h2);
    				detach_dev(t1);
    				detach_dev(h30);
    				detach_dev(t3);
    				detach_dev(h10);
    				detach_dev(t6);
    				detach_dev(button0);
    				detach_dev(t8);
    				detach_dev(button1);
    				detach_dev(t10);
    				detach_dev(button2);
    				detach_dev(t12);
    				detach_dev(h31);
    				detach_dev(t14);
    				detach_dev(h11);
    				detach_dev(t17);
    				detach_dev(h32);
    				detach_dev(t19);
    				detach_dev(p);
    				detach_dev(t24);
    				detach_dev(h33);
    				detach_dev(t26);
    				detach_dev(h4);
    				detach_dev(t28);
    				detach_dev(input);
    				detach_dev(t29);
    				detach_dev(button3);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$i.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let $count, $time, $elapsed, $greeting, $name;

    	validate_store(count, 'count');
    	component_subscribe($$self, count, $$value => { $count = $$value; $$invalidate('$count', $count); });
    	validate_store(time, 'time');
    	component_subscribe($$self, time, $$value => { $time = $$value; $$invalidate('$time', $time); });
    	validate_store(elapsed, 'elapsed');
    	component_subscribe($$self, elapsed, $$value => { $elapsed = $$value; $$invalidate('$elapsed', $elapsed); });
    	validate_store(greeting, 'greeting');
    	component_subscribe($$self, greeting, $$value => { $greeting = $$value; $$invalidate('$greeting', $greeting); });
    	validate_store(name, 'name');
    	component_subscribe($$self, name, $$value => { $name = $$value; $$invalidate('$name', $name); });

    	

      // let count_value;

      // const unsubscribe = count.subscribe(value => {
      //   count_value = value;
      // });

      const formatter = new Intl.DateTimeFormat("en", {
        hour12: true,
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit"
      });

    	function input_input_handler() {
    		name.set(this.value);
    	}

    	const click_handler = () => (set_store_value(name, $name += '!'));

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('$count' in $$props) count.set($count);
    		if ('$time' in $$props) time.set($time);
    		if ('$elapsed' in $$props) elapsed.set($elapsed);
    		if ('$greeting' in $$props) greeting.set($greeting);
    		if ('$name' in $$props) name.set($name);
    	};

    	return {
    		formatter,
    		$count,
    		$time,
    		$elapsed,
    		$greeting,
    		$name,
    		input_input_handler,
    		click_handler
    	};
    }

    class Stores extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$i, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Stores", options, id: create_fragment$i.name });
    	}
    }

    /* src/concepts/Other.svelte generated by Svelte v3.12.1 */

    const file$i = "src/concepts/Other.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.c = list[i];
    	return child_ctx;
    }

    // (90:0) {:else}
    function create_else_block$3(ctx) {
    	var button, dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Turn on confetti";
    			attr_dev(button, "class", "svelte-1tgiqc0");
    			add_location(button, file$i, 90, 2, 1659);
    			dispose = listen_dev(button, "click", ctx.toggle);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(button);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$3.name, type: "else", source: "(90:0) {:else}", ctx });
    	return block;
    }

    // (88:0) {#if toggled}
    function create_if_block_1$1(ctx) {
    	var button, dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Turn off";
    			attr_dev(button, "class", "svelte-1tgiqc0");
    			add_location(button, file$i, 88, 2, 1605);
    			dispose = listen_dev(button, "click", ctx.toggle);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(button);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$1.name, type: "if", source: "(88:0) {#if toggled}", ctx });
    	return block;
    }

    // (93:0) {#if toggled}
    function create_if_block$2(ctx) {
    	var each_1_anchor;

    	let each_value = ctx.confetti;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.confetti) {
    				each_value = ctx.confetti;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(each_1_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$2.name, type: "if", source: "(93:0) {#if toggled}", ctx });
    	return block;
    }

    // (94:2) {#each confetti as c}
    function create_each_block$3(ctx) {
    	var div, t0_value = ctx.c.character + "", t0, t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			set_style(div, "left", "" + ctx.c.x + "%");
    			set_style(div, "top", "" + ctx.c.y + "%");
    			set_style(div, "transform", "scale(" + ctx.c.r + ")");
    			attr_dev(div, "class", "svelte-1tgiqc0");
    			add_location(div, file$i, 94, 4, 1759);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.confetti) && t0_value !== (t0_value = ctx.c.character + "")) {
    				set_data_dev(t0, t0_value);
    			}

    			if (changed.confetti) {
    				set_style(div, "left", "" + ctx.c.x + "%");
    				set_style(div, "top", "" + ctx.c.y + "%");
    				set_style(div, "transform", "scale(" + ctx.c.r + ")");
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$3.name, type: "each", source: "(94:2) {#each confetti as c}", ctx });
    	return block;
    }

    function create_fragment$j(ctx) {
    	var h20, t1, button0, t2, button0_class_value, t3, button1, t5, label, input, t6, t7, div0, t8, t9_value = ctx.big ? 'big' : 'small' + "", t9, t10, t11, h21, t13, div1, t15, h22, t17, t18, if_block1_anchor, dispose;

    	function select_block_type(changed, ctx) {
    		if (ctx.toggled) return create_if_block_1$1;
    		return create_else_block$3;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block0 = current_block_type(ctx);

    	var if_block1 = (ctx.toggled) && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			h20 = element("h2");
    			h20.textContent = "Classes";
    			t1 = space();
    			button0 = element("button");
    			t2 = text("bar");
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "baz";
    			t5 = space();
    			label = element("label");
    			input = element("input");
    			t6 = text("\n  big");
    			t7 = space();
    			div0 = element("div");
    			t8 = text("some ");
    			t9 = text(t9_value);
    			t10 = text(" text");
    			t11 = space();
    			h21 = element("h2");
    			h21.textContent = "Debugging";
    			t13 = space();
    			div1 = element("div");
    			div1.textContent = "Can use @debug to debug in the browser";
    			t15 = space();
    			h22 = element("h2");
    			h22.textContent = "Animations, Motions, Transitions";
    			t17 = space();
    			if_block0.c();
    			t18 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			add_location(h20, file$i, 63, 0, 1033);
    			attr_dev(button0, "class", button0_class_value = "" + null_to_empty((ctx.current === 'bar' ? 'active' : '')) + " svelte-1tgiqc0");
    			add_location(button0, file$i, 64, 0, 1050);
    			attr_dev(button1, "class", "svelte-1tgiqc0");
    			toggle_class(button1, "active", ctx.current === 'baz');
    			add_location(button1, file$i, 71, 0, 1211);
    			attr_dev(input, "type", "checkbox");
    			add_location(input, file$i, 77, 2, 1360);
    			add_location(label, file$i, 76, 0, 1350);
    			attr_dev(div0, "class", "svelte-1tgiqc0");
    			toggle_class(div0, "big", ctx.big);
    			add_location(div0, file$i, 81, 0, 1421);
    			add_location(h21, file$i, 83, 0, 1477);
    			attr_dev(div1, "class", "svelte-1tgiqc0");
    			add_location(div1, file$i, 84, 0, 1496);
    			add_location(h22, file$i, 86, 0, 1547);

    			dispose = [
    				listen_dev(button0, "click", ctx.click_handler),
    				listen_dev(button1, "click", ctx.click_handler_1),
    				listen_dev(input, "change", ctx.input_change_handler)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button0, anchor);
    			append_dev(button0, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, label, anchor);
    			append_dev(label, input);

    			input.checked = ctx.big;

    			append_dev(label, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t8);
    			append_dev(div0, t9);
    			append_dev(div0, t10);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, div1, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, h22, anchor);
    			insert_dev(target, t17, anchor);
    			if_block0.m(target, anchor);
    			insert_dev(target, t18, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.current) && button0_class_value !== (button0_class_value = "" + null_to_empty((ctx.current === 'bar' ? 'active' : '')) + " svelte-1tgiqc0")) {
    				attr_dev(button0, "class", button0_class_value);
    			}

    			if (changed.current) {
    				toggle_class(button1, "active", ctx.current === 'baz');
    			}

    			if (changed.big) input.checked = ctx.big;

    			if ((changed.big) && t9_value !== (t9_value = ctx.big ? 'big' : 'small' + "")) {
    				set_data_dev(t9, t9_value);
    			}

    			if (changed.big) {
    				toggle_class(div0, "big", ctx.big);
    			}

    			if (current_block_type !== (current_block_type = select_block_type(changed, ctx))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);
    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(t18.parentNode, t18);
    				}
    			}

    			if (ctx.toggled) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h20);
    				detach_dev(t1);
    				detach_dev(button0);
    				detach_dev(t3);
    				detach_dev(button1);
    				detach_dev(t5);
    				detach_dev(label);
    				detach_dev(t7);
    				detach_dev(div0);
    				detach_dev(t11);
    				detach_dev(h21);
    				detach_dev(t13);
    				detach_dev(div1);
    				detach_dev(t15);
    				detach_dev(h22);
    				detach_dev(t17);
    			}

    			if_block0.d(detaching);

    			if (detaching) {
    				detach_dev(t18);
    			}

    			if (if_block1) if_block1.d(detaching);

    			if (detaching) {
    				detach_dev(if_block1_anchor);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$j.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let current = "baz";
      let big = false;

      let characters = ["🥳", "🎉", "✨"];
      let toggled = false;

      function toggle() {
        $$invalidate('toggled', toggled = !toggled);
      }

      let confetti = new Array(100).fill().map((_, i) => {
        return {
          character: characters[i % characters.length],
          x: Math.random() * 100,
          y: -20 - Math.random() * 100,
          r: 0.1 + Math.random() * 1
        };
      });
      confetti.sort((a, b) => a.r - b.r);

      onMount(() => {
        let frame;

        function loop() {
          frame = requestAnimationFrame(loop);

          $$invalidate('confetti', confetti = confetti.map(emoji => {
            emoji.y += 0.7 * emoji.r;
            if (emoji.y > 120) emoji.y = -20;
            return emoji;
          }));
        }

        loop();

        return () => cancelAnimationFrame(frame);
      });

    	const click_handler = () => ($$invalidate('current', current = 'bar'));

    	const click_handler_1 = () => ($$invalidate('current', current = 'baz'));

    	function input_change_handler() {
    		big = this.checked;
    		$$invalidate('big', big);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('current' in $$props) $$invalidate('current', current = $$props.current);
    		if ('big' in $$props) $$invalidate('big', big = $$props.big);
    		if ('characters' in $$props) characters = $$props.characters;
    		if ('toggled' in $$props) $$invalidate('toggled', toggled = $$props.toggled);
    		if ('confetti' in $$props) $$invalidate('confetti', confetti = $$props.confetti);
    	};

    	return {
    		current,
    		big,
    		toggled,
    		toggle,
    		confetti,
    		click_handler,
    		click_handler_1,
    		input_change_handler
    	};
    }

    class Other extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$j, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Other", options, id: create_fragment$j.name });
    	}
    }

    /* src/concepts/Concepts.svelte generated by Svelte v3.12.1 */

    const file$j = "src/concepts/Concepts.svelte";

    function create_fragment$k(ctx) {
    	var br0, t0, t1, br1, t2, t3, br2, t4, t5, br3, t6, t7, br4, t8, t9, br5, t10, t11, br6, t12, t13, br7, t14, t15, br8, current;

    	var reactivity = new Reactivity({ $$inline: true });

    	var props = new Props({ $$inline: true });

    	var logic = new Logic({ $$inline: true });

    	var events = new Events({ $$inline: true });

    	var bindings = new Bindings({ $$inline: true });

    	var lifecycle = new Lifecycle({ $$inline: true });

    	var stores = new Stores({ $$inline: true });

    	var other = new Other({ $$inline: true });

    	const block = {
    		c: function create() {
    			br0 = element("br");
    			t0 = space();
    			reactivity.$$.fragment.c();
    			t1 = space();
    			br1 = element("br");
    			t2 = space();
    			props.$$.fragment.c();
    			t3 = space();
    			br2 = element("br");
    			t4 = space();
    			logic.$$.fragment.c();
    			t5 = space();
    			br3 = element("br");
    			t6 = space();
    			events.$$.fragment.c();
    			t7 = space();
    			br4 = element("br");
    			t8 = space();
    			bindings.$$.fragment.c();
    			t9 = space();
    			br5 = element("br");
    			t10 = space();
    			lifecycle.$$.fragment.c();
    			t11 = space();
    			br6 = element("br");
    			t12 = space();
    			stores.$$.fragment.c();
    			t13 = space();
    			br7 = element("br");
    			t14 = space();
    			other.$$.fragment.c();
    			t15 = space();
    			br8 = element("br");
    			add_location(br0, file$j, 11, 0, 352);
    			add_location(br1, file$j, 13, 0, 374);
    			add_location(br2, file$j, 15, 0, 391);
    			add_location(br3, file$j, 17, 0, 408);
    			add_location(br4, file$j, 19, 0, 426);
    			add_location(br5, file$j, 21, 0, 446);
    			add_location(br6, file$j, 23, 0, 467);
    			add_location(br7, file$j, 25, 0, 485);
    			add_location(br8, file$j, 27, 0, 502);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(reactivity, target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(props, target, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, br2, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(logic, target, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, br3, anchor);
    			insert_dev(target, t6, anchor);
    			mount_component(events, target, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, br4, anchor);
    			insert_dev(target, t8, anchor);
    			mount_component(bindings, target, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, br5, anchor);
    			insert_dev(target, t10, anchor);
    			mount_component(lifecycle, target, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, br6, anchor);
    			insert_dev(target, t12, anchor);
    			mount_component(stores, target, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, br7, anchor);
    			insert_dev(target, t14, anchor);
    			mount_component(other, target, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, br8, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(reactivity.$$.fragment, local);

    			transition_in(props.$$.fragment, local);

    			transition_in(logic.$$.fragment, local);

    			transition_in(events.$$.fragment, local);

    			transition_in(bindings.$$.fragment, local);

    			transition_in(lifecycle.$$.fragment, local);

    			transition_in(stores.$$.fragment, local);

    			transition_in(other.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(reactivity.$$.fragment, local);
    			transition_out(props.$$.fragment, local);
    			transition_out(logic.$$.fragment, local);
    			transition_out(events.$$.fragment, local);
    			transition_out(bindings.$$.fragment, local);
    			transition_out(lifecycle.$$.fragment, local);
    			transition_out(stores.$$.fragment, local);
    			transition_out(other.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(br0);
    				detach_dev(t0);
    			}

    			destroy_component(reactivity, detaching);

    			if (detaching) {
    				detach_dev(t1);
    				detach_dev(br1);
    				detach_dev(t2);
    			}

    			destroy_component(props, detaching);

    			if (detaching) {
    				detach_dev(t3);
    				detach_dev(br2);
    				detach_dev(t4);
    			}

    			destroy_component(logic, detaching);

    			if (detaching) {
    				detach_dev(t5);
    				detach_dev(br3);
    				detach_dev(t6);
    			}

    			destroy_component(events, detaching);

    			if (detaching) {
    				detach_dev(t7);
    				detach_dev(br4);
    				detach_dev(t8);
    			}

    			destroy_component(bindings, detaching);

    			if (detaching) {
    				detach_dev(t9);
    				detach_dev(br5);
    				detach_dev(t10);
    			}

    			destroy_component(lifecycle, detaching);

    			if (detaching) {
    				detach_dev(t11);
    				detach_dev(br6);
    				detach_dev(t12);
    			}

    			destroy_component(stores, detaching);

    			if (detaching) {
    				detach_dev(t13);
    				detach_dev(br7);
    				detach_dev(t14);
    			}

    			destroy_component(other, detaching);

    			if (detaching) {
    				detach_dev(t15);
    				detach_dev(br8);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$k.name, type: "component", source: "", ctx });
    	return block;
    }

    class Concepts extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$k, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Concepts", options, id: create_fragment$k.name });
    	}
    }

    /* src/App.svelte generated by Svelte v3.12.1 */

    const file$k = "src/App.svelte";

    function create_fragment$l(ctx) {
    	var h1, t1, t2, t3, t4, t5, current;

    	var helloworld = new HelloWorld({ props: { name: "Court" }, $$inline: true });

    	var image = new Image({ $$inline: true });

    	var worstparagraph = new WorstParagraph({ $$inline: true });

    	var riskyhtml = new RiskyHTML({ $$inline: true });

    	var concepts = new Concepts({ $$inline: true });

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "The App";
    			t1 = space();
    			helloworld.$$.fragment.c();
    			t2 = space();
    			image.$$.fragment.c();
    			t3 = space();
    			worstparagraph.$$.fragment.c();
    			t4 = space();
    			riskyhtml.$$.fragment.c();
    			t5 = space();
    			concepts.$$.fragment.c();
    			add_location(h1, file$k, 9, 0, 356);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(helloworld, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(image, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(worstparagraph, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(riskyhtml, target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(concepts, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(helloworld.$$.fragment, local);

    			transition_in(image.$$.fragment, local);

    			transition_in(worstparagraph.$$.fragment, local);

    			transition_in(riskyhtml.$$.fragment, local);

    			transition_in(concepts.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(helloworld.$$.fragment, local);
    			transition_out(image.$$.fragment, local);
    			transition_out(worstparagraph.$$.fragment, local);
    			transition_out(riskyhtml.$$.fragment, local);
    			transition_out(concepts.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    			}

    			destroy_component(helloworld, detaching);

    			if (detaching) {
    				detach_dev(t2);
    			}

    			destroy_component(image, detaching);

    			if (detaching) {
    				detach_dev(t3);
    			}

    			destroy_component(worstparagraph, detaching);

    			if (detaching) {
    				detach_dev(t4);
    			}

    			destroy_component(riskyhtml, detaching);

    			if (detaching) {
    				detach_dev(t5);
    			}

    			destroy_component(concepts, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$l.name, type: "component", source: "", ctx });
    	return block;
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$l, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$l.name });
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
