import { JsonError } from '@core';
import type { RecursiveDescentSegment } from '@path';
import { type Converter, DataKind, DynamicSchema, DynamicSchemaNode, type Schema, type Validator } from '@schema';

export class UUID {
    constructor(public value: string) {}
    toString() {
        return this.value;
    }
    toJSON() {
        return this.value;
    }
}

export const Pgxuuid: Converter & Validator = {
    Convert: (data: any, schema: Schema, pathSegments: RecursiveDescentSegment) => {
        if (typeof data === 'string') return new UUID(data);
        if (data instanceof UUID) return data;
        throw new JsonError('Unsupported type for UUID conversion');
    },
    ValidateData: (data: any, schema: Schema, pathSegments: RecursiveDescentSegment) => {
        if (data instanceof UUID) return true;
        if (typeof data === 'string') {
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data);
        }
        return false;
    }
};

export function JsonMapSchema(): Schema {
    return new DynamicSchemaNode({
        Kind: DataKind.Map,
        ChildNodesAssociativeCollectionEntriesKeySchema: new DynamicSchemaNode({ Kind: DataKind.String }),
        ChildNodesAssociativeCollectionEntriesValueSchema: new DynamicSchemaNode({ Kind: DataKind.Any })
    });
}

export class NestedItem {
    constructor(
        public ID: number = 0,
        public MapData: Map<string, any> = new Map(),
        public ListData: any[] = []
    ) {}
}

export function NestedItemSchema(): DynamicSchemaNode {
    return new DynamicSchemaNode({
        Kind: DataKind.Object,
        DefaultValue: () => new NestedItem(),
        ChildNodes: {
            ID: new DynamicSchemaNode({ Kind: DataKind.Number }),
            MapData: new DynamicSchemaNode({
                Kind: DataKind.Map,
                ChildNodesAssociativeCollectionEntriesKeySchema: new DynamicSchemaNode({ Kind: DataKind.String }),
                ChildNodesAssociativeCollectionEntriesValueSchema: new DynamicSchemaNode({ Kind: DataKind.Any })
            }),
            ListData: new DynamicSchemaNode({
                Kind: DataKind.Array,
                ChildNodesLinearCollectionElementsSchema: new DynamicSchemaNode({ Kind: DataKind.Any })
            })
        }
    });
}

export class Circle {
    constructor(public Radius: number = 0.0) {}
}

export function CircleSchema(): DynamicSchemaNode {
    return new DynamicSchemaNode({
        Kind: DataKind.Object,
        DefaultValue: () => new Circle(),
        ChildNodes: {
            Radius: new DynamicSchemaNode({ Kind: DataKind.Number })
        }
    });
}

export class Square {
    constructor(public Side: number = 0.0) {}
}

export function SquareSchema(): DynamicSchemaNode {
    return new DynamicSchemaNode({
        Kind: DataKind.Object,
        DefaultValue: () => new Square(),
        ChildNodes: {
            Side: new DynamicSchemaNode({ Kind: DataKind.Number })
        }
    });
}

export function ShapeSchema(): Schema {
    return new DynamicSchema({
        DefaultSchemaNodeKey: 'default',
        Nodes: {
            Circle: CircleSchema(),
            Square: SquareSchema()
        }
    });
}

export function ListOfShapesSchema(): Schema {
    return new DynamicSchemaNode({
        Kind: DataKind.Array,
        ChildNodesLinearCollectionElementsSchema: ShapeSchema()
    });
}

export class User {
    constructor(
        public ID: number = 0,
        public Name: string = '',
        public Email: string = ''
    ) {}
}

export function UserSchema(): DynamicSchemaNode {
    return new DynamicSchemaNode({
        Kind: DataKind.Object,
        DefaultValue: () => new User(),

        ChildNodes: {
            ID: new DynamicSchemaNode({ Kind: DataKind.Number, DefaultValue: () => 0 }),
            Name: new DynamicSchemaNode({ Kind: DataKind.String, DefaultValue: () => '' }),
            Email: new DynamicSchemaNode({ Kind: DataKind.String, DefaultValue: () => '' })
        }
    });
}

export class Company {
    constructor(
        public Name: string = '',
        public Employees: User[] = []
    ) {}
}

export function CompanySchema(): DynamicSchemaNode {
    return new DynamicSchemaNode({
        Kind: DataKind.Object,
        DefaultValue: () => new Company(),

        ChildNodes: {
            Name: new DynamicSchemaNode({ Kind: DataKind.String, DefaultValue: () => '' }),
            Employees: new DynamicSchemaNode({
                Kind: DataKind.Array,
                ChildNodesLinearCollectionElementsSchema: UserSchema()
            })
        }
    });
}

export class Employee {
    constructor(
        public ID: number = 0,
        public Profile: UserProfile2 = new UserProfile2(),
        public Skills: string[] = [],
        public ProjectHours: Map<string, number> = new Map()
    ) {}
}

export function EmployeeSchema(): DynamicSchemaNode {
    return new DynamicSchemaNode({
        Kind: DataKind.Object,
        DefaultValue: () => new Employee(),

        ChildNodes: {
            ID: new DynamicSchemaNode({ Kind: DataKind.Number, DefaultValue: () => 0 }),
            Profile: UserProfile2Schema(),
            Skills: new DynamicSchemaNode({
                Kind: DataKind.Array,
                ChildNodesLinearCollectionElementsSchema: new DynamicSchemaNode({ Kind: DataKind.String })
            }),
            ProjectHours: new DynamicSchemaNode({
                Kind: DataKind.Map,
                ChildNodesAssociativeCollectionEntriesKeySchema: new DynamicSchemaNode({ Kind: DataKind.String }),
                ChildNodesAssociativeCollectionEntriesValueSchema: new DynamicSchemaNode({ Kind: DataKind.Number })
            })
        }
    });
}

export class Address {
    constructor(
        public Street: string = '',
        public City: string = '',
        public ZipCode: string | null = null
    ) {}
}

export function AddressSchema(): DynamicSchemaNode {
    return new DynamicSchemaNode({
        Kind: DataKind.Object,
        DefaultValue: () => new Address(),

        ChildNodes: {
            Street: new DynamicSchemaNode({ Kind: DataKind.String, DefaultValue: () => '' }),
            City: new DynamicSchemaNode({ Kind: DataKind.String, DefaultValue: () => '' }),
            ZipCode: new DynamicSchemaNode({ Kind: DataKind.String, Nullable: true })
        }
    });
}

export class UserWithAddress {
    constructor(
        public Name: string = '',
        public Address: Address | null = null
    ) {}
}

export function UserWithAddressSchema(): DynamicSchemaNode {
    return new DynamicSchemaNode({
        Kind: DataKind.Object,
        DefaultValue: () => new UserWithAddress(),

        ChildNodes: {
            Name: new DynamicSchemaNode({ Kind: DataKind.String, DefaultValue: () => '' }),
            Address: AddressSchema()
        }
    });
}

export class UserProfile2 {
    constructor(
        public Name: string = '',
        public Age: number = 0,
        public Country: string = '',
        public Occupation: string = ''
    ) {}
}

export function UserProfile2Schema(): DynamicSchemaNode {
    return new DynamicSchemaNode({
        Kind: DataKind.Object,
        DefaultValue: () => new UserProfile2(),

        ChildNodes: {
            Name: new DynamicSchemaNode({ Kind: DataKind.String, DefaultValue: () => '' }),
            Age: new DynamicSchemaNode({ Kind: DataKind.Number, DefaultValue: () => 0 }),
            Country: new DynamicSchemaNode({ Kind: DataKind.String, DefaultValue: () => '' }),
            Occupation: new DynamicSchemaNode({ Kind: DataKind.String, DefaultValue: () => '' })
        }
    });
}

export class UserWithUuidId {
    constructor(
        public ID: UUID | null = null,
        public Profile: UserProfile2 | null = null
    ) {}
}

export function UserWithUuidIdSchema(): DynamicSchemaNode {
    return new DynamicSchemaNode({
        Kind: DataKind.Object,
        DefaultValue: () => new UserWithUuidId(),
        ChildNodes: {
            ID: new DynamicSchemaNode({
                Kind: DataKind.Object,
                Validator: Pgxuuid,
                Converter: Pgxuuid
            }),
            Profile: UserProfile2Schema()
        }
    });
}

export function DynamicUserSchema(): DynamicSchema {
    return new DynamicSchema({
        DefaultSchemaNodeKey: 'UserWithAddress',
        Nodes: {
            User: UserSchema(),
            UserProfile2: UserProfile2Schema(),
            UserWithUuidID: UserWithUuidIdSchema(),
            UserWithAddress: UserWithAddressSchema()
        }
    });
}

export class Product {
    constructor(
        public ID: number = 0,
        public Name: string = '',
        public Price: number = 0.0
    ) {}
}

export function ProductSchema(): DynamicSchemaNode {
    return new DynamicSchemaNode({
        Kind: DataKind.Object,
        DefaultValue: () => new Product(),
        ChildNodes: {
            ID: new DynamicSchemaNode({ Kind: DataKind.Number, DefaultValue: () => 0 }),
            Name: new DynamicSchemaNode({ Kind: DataKind.String, DefaultValue: () => '' }),
            Price: new DynamicSchemaNode({ Kind: DataKind.Number, DefaultValue: () => 0.0 })
        }
    });
}

export function ListOfProductsSchema(): DynamicSchemaNode {
    return new DynamicSchemaNode({
        Kind: DataKind.Array,
        ChildNodesLinearCollectionElementsSchema: ProductSchema()
    });
}

export function MapUserSchema(): DynamicSchemaNode {
    return new DynamicSchemaNode({
        Kind: DataKind.Map,
        ChildNodesAssociativeCollectionEntriesKeySchema: new DynamicSchemaNode({ Kind: DataKind.Number }),
        ChildNodesAssociativeCollectionEntriesValueSchema: UserSchema()
    });
}

export function ListOfNestedItemSchema(): DynamicSchemaNode {
    return new DynamicSchemaNode({
        Kind: DataKind.Array,
        ChildNodesLinearCollectionElementsSchema: NestedItemSchema()
    });
}
