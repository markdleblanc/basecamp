export default class Reflection {
    private original: object | undefined;
    private readonly target: object;

    private lookup: Map<string | symbol, boolean> = new Map();
    private overrides: Map<string | symbol, (...args: any) => unknown> =
        new Map();
    private injections: Map<string | symbol, (...args: any) => unknown> =
        new Map();

    public constructor(target: object) {
        this.target = target;
    }

    public save() {
        /**
         * Store a copy of the original object properties and functions.
         */
        this.original = { ...this.target };
        return this;
    }

    public override(
        property: string | symbol,
        callback: (...args: any) => unknown
    ) {
        if (this.lookup.has(property)) {
            throw new Error(
                `Property ${String(property)} has an existing proxy applied.`
            );
        }

        this.lookup.set(property, true);
        this.overrides.set(property, callback);
        return this;
    }

    public inject(
        property: string | symbol,
        callback: (...args: any) => unknown
    ) {
        if (this.lookup.has(property)) {
            throw new Error(
                `Property ${String(property)} has an existing proxy applied.`
            );
        }

        this.lookup.set(property, true);
        this.injections.set(property, callback);
        return this;
    }

    public apply() {
        for (const [property, callback] of this.overrides) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.target[property] = new Proxy(this.target[property], {
                apply(_target, thisArg: any, argArray: any[]): any {
                    return callback.bind(thisArg)(...argArray);
                },
            });
        }

        for (const [property, callback] of this.injections) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.target[property] = new Proxy(this.target[property], {
                apply(_target, thisArg: any, argArray: any[]): any {
                    callback.bind(thisArg)(...argArray);
                    return _target.bind(thisArg)(...argArray);
                },
            });
        }

        return this;
    }

    public restore() {
        for (const property of this.lookup.keys()) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.target[property] = this.original[property];
        }
        return this;
    }
}
