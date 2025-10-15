import {
    type Converter,
    DataKinds,
    DynamicSchema,
    DynamicSchemaNode,
    type Schema,
    SchemaError,
    SchemaErrorCodes,
    type Validator
} from '@schema'
import type {RecursiveDescentSegment} from '@path'

export class NestedItem {
    public ID: number = 0
    public MapData: Map<string, any> = new Map()
    public ListData: any[] = []
}

export function NestedItemSchema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Object)
        .withTypeOf(typeof new NestedItem())
        .withDefaultValue(() => {
            return new NestedItem()
        })
        .withIsDefaultValueSet(true)
        .withChildNodes(
            new Map<string, Schema>([
                ['ID', DynamicSchemaNode.create()
                    .withKind(DataKinds.Number)
                    .withTypeOf(typeof 0)
                    .build()
                ],
                ['MapData', DynamicSchemaNode.create()
                    .withKind(DataKinds.Object)
                    .withTypeOf(typeof {})
                    .withChildNodesAssociativeCollectionEntriesKeySchema(DynamicSchemaNode.create()
                        .withKind(DataKinds.String)
                        .withTypeOf(typeof '')
                        .build())
                    .withChildNodesAssociativeCollectionEntriesValueSchema(DynamicSchemaNode.create()
                        .withKind(DataKinds.Any)
                        .build())
                    .build()
                ],
                ['ListData', DynamicSchemaNode.create()
                    .withKind(DataKinds.Array)
                    .withTypeOf(typeof [])
                    .withChildNodesLinearCollectionElementsSchema(DynamicSchemaNode.create()
                        .withKind(DataKinds.Any)
                        .build())
                    .build()
                ]
            ])
        )
        .build()
}

export function ListOfNestedItemSchema(): Schema {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Array)
        .withTypeOf(typeof [new NestedItem()])
        .withChildNodesLinearCollectionElementsSchema(NestedItemSchema())
        .build()
}

export interface Shape {
    isShape: () => boolean
}

export function ShapeSchema(): Schema {
    return DynamicSchema.create()
        .withNodes(
            new Map<string, DynamicSchemaNode>([
                ['Circle', CircleSchema()],
                ['Square', SquareSchema()]
            ])
        )
        .build()
}

export function ListOfShapesSchema(): Schema {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Array)
        .withTypeOf(typeof [new Circle(), new Square()])
        .withChildNodesLinearCollectionElementsSchema(ShapeSchema())
        .build()
}

export class Circle implements Shape {
    public Radius: number = 0.0

    public isShape(): boolean {
        return true
    }
}

export function CircleSchema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Object)
        .withTypeOf(typeof new Circle())
        .withDefaultValue(() => {
            return new Circle()
        })
        .withIsDefaultValueSet(true)
        .withChildNodes(
            new Map<string, Schema>([
                ['Radius', DynamicSchemaNode.create()
                    .withKind(DataKinds.Number)
                    .withTypeOf(typeof 0.0)
                    .build()
                ]
            ])
        )
        .build()
}

export class Square implements Shape {
    public Side: number = 0.0

    public isShape(): boolean {
        return true
    }
}

export function SquareSchema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Object)
        .withTypeOf(typeof new Square())
        .withDefaultValue(() => {
            return new Square()
        })
        .withIsDefaultValueSet(true)
        .withChildNodes(
            new Map<string, Schema>([
                ['Side', DynamicSchemaNode.create()
                    .withKind(DataKinds.Number)
                    .withTypeOf(typeof 0.0)
                    .build()
                ]
            ])
        )
        .build()
}

export class User2 {
    public ID: CustomUUID = CustomUUID.create()
    public Name: string = ''
}

export function User2Schema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Object)
        .withTypeOf(typeof new User2())
        .withDefaultValue(() => {
            return new User2()
        })
        .withIsDefaultValueSet(true)
        .withChildNodes(
            new Map<string, Schema>([
                ['ID', CustomUUIDSchema()],
                ['Name', DynamicSchemaNode.create()
                    .withKind(DataKinds.String)
                    .withTypeOf(typeof '')
                    .build()
                ]
            ])
        )
        .build()
}

export class UserWithAddress {
    public Name: string = ''
    public Address: Address = new Address()
}

export function UserWithAddressSchema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Object)
        .withTypeOf(typeof new UserWithAddress())
        .withDefaultValue(() => {
            return new UserWithAddress()
        })
        .withIsDefaultValueSet(true)
        .withChildNodes(
            new Map<string, Schema>([
                ['Name', DynamicSchemaNode.create()
                    .withKind(DataKinds.String)
                    .withTypeOf(typeof '')
                    .build()
                ],
                ['Address', AddressSchema()]
            ])
        )
        .build()
}

export class UserProfile {
    public Name: string = ''
    public Age: number = 0
    public Address: Address = new Address()
}

export function UserProfileSchema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Object)
        .withTypeOf(typeof new UserProfile())
        .withDefaultValue(() => {
            return new UserProfile()
        })
        .withIsDefaultValueSet(true)
        .withChildNodes(
            new Map<string, Schema>([
                ['Name', DynamicSchemaNode.create()
                    .withKind(DataKinds.String)
                    .withTypeOf(typeof '')
                    .build()
                ],
                ['Age', DynamicSchemaNode.create()
                    .withKind(DataKinds.Number)
                    .withTypeOf(typeof 0)
                    .build()
                ],
                ['Address', AddressSchema()]
            ])
        )
        .build()
}

export class UserWithUuidId {
    public ID: CustomUUID = CustomUUID.create()
    public Profile: UserProfile2 = new UserProfile2()
}

export function UserWithUuidIdSchema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Object)
        .withTypeOf(typeof new UserWithUuidId())
        .withDefaultValue(() => {
            return new UserWithUuidId()
        })
        .withIsDefaultValueSet(true)
        .withChildNodes(
            new Map<string, Schema>([
                ['ID', CustomUUIDSchema()],
                ['Profile', UserProfile2Schema()]
            ])
        )
        .build()
}

export class Employee {
    public ID: number = 0
    public Profile: UserProfile = new UserProfile()
    Skills: string[] = []
    ProjectHours: Map<string, number> = new Map<string, number>()
}

export function EmployeeSchema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Object)
        .withTypeOf(typeof new Employee())
        .withDefaultValue(() => {
            return new Employee()
        })
        .withIsDefaultValueSet(true)
        .withChildNodes(
            new Map<string, Schema>([
                ['ID', DynamicSchemaNode.create()
                    .withKind(DataKinds.Number)
                    .withTypeOf(typeof 0)
                    .build()
                ],
                ['Profile', UserProfileSchema()],
                ['Skills', DynamicSchemaNode.create()
                    .withKind(DataKinds.Array)
                    .withTypeOf(typeof ['skill one', 'skill two'])
                    .withChildNodesLinearCollectionElementsSchema(DynamicSchemaNode.create()
                        .withKind(DataKinds.String)
                        .withTypeOf(typeof '')
                        .build()
                    )
                    .build()
                ],
                ['ProjectHours', DynamicSchemaNode.create()
                    .withKind(DataKinds.Map)
                    .withTypeOf(typeof new Map<string, number>())
                    .withDefaultValue(() => {
                        return new Map<string, number>()
                    })
                    .withChildNodesAssociativeCollectionEntriesKeySchema(DynamicSchemaNode.create()
                        .withKind(DataKinds.String)
                        .withTypeOf(typeof '')
                        .build())
                    .withChildNodesAssociativeCollectionEntriesValueSchema(DynamicSchemaNode.create()
                        .withKind(DataKinds.Number)
                        .withTypeOf(typeof 0.0)
                        .build())
                    .build()
                ]
            ])
        )
        .build()
}

export class User {
    public ID: number = 0
    public Name: string = ''
    public Email: string = ''
}

export function UserSchema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Object)
        .withTypeOf(typeof new User())
        .withDefaultValue(() => {
            return new User()
        })
        .withIsDefaultValueSet(true)
        .withChildNodes(
            new Map<string, Schema>([
                ['ID', DynamicSchemaNode.create()
                    .withKind(DataKinds.Number)
                    .withTypeOf(typeof 0)
                    .build()
                ],
                ['Name', DynamicSchemaNode.create()
                    .withKind(DataKinds.String)
                    .withTypeOf(typeof '')
                    .build()
                ],
                ['Email', DynamicSchemaNode.create()
                    .withKind(DataKinds.String)
                    .withTypeOf(typeof '')
                    .build()
                ]
            ])
        )
        .build()
}

export function MapUserSchema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Map)
        .withTypeOf(typeof new Map<string, User>())
        .withDefaultValue(() => {
            return new Map<string, User>()
        })
        .withIsDefaultValueSet(true)
        .withChildNodesAssociativeCollectionEntriesKeySchema(DynamicSchemaNode.create()
            .withKind(DataKinds.Number)
            .withTypeOf(typeof 0)
            .build()
        )
        .withChildNodesAssociativeCollectionEntriesValueSchema(UserSchema())
        .build()
}

export class Product {
    public ID: number = 0
    public Name: string = ''
    public Price: number = 0.0
}

export function ProductSchema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Object)
        .withTypeOf(typeof new Product())
        .withDefaultValue(() => {
            return new Product()
        })
        .withIsDefaultValueSet(true)
        .withChildNodes(
            new Map<string, Schema>([
                ['ID', DynamicSchemaNode.create()
                    .withKind(DataKinds.Number)
                    .withTypeOf(typeof 0)
                    .build()
                ],
                ['Name', DynamicSchemaNode.create()
                    .withKind(DataKinds.String)
                    .withTypeOf(typeof '')
                    .build()
                ],
                ['Price', DynamicSchemaNode.create()
                    .withKind(DataKinds.Number)
                    .withTypeOf(typeof 0.0)
                    .build()
                ]
            ])
        )
        .build()
}

export function ListOfProductsSchema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Array)
        .withTypeOf(typeof [new Product(), new Product()])
        .withChildNodesLinearCollectionElementsSchema(ProductSchema())
        .build()
}

export class Company {
    public Name: string = ''
    public Employees: Employee[] = []
}

export function CompanySchema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Object)
        .withTypeOf(typeof new Company())
        .withDefaultValue(() => {
            return new Company()
        })
        .withIsDefaultValueSet(true)
        .withChildNodes(
            new Map<string, Schema>([
                ['Name', DynamicSchemaNode.create()
                    .withKind(DataKinds.String)
                    .withTypeOf(typeof '')
                    .build()
                ],
                ['Employees', DynamicSchemaNode.create()
                    .withKind(DataKinds.Array)
                    .withTypeOf(typeof [new Employee(), new Employee()])
                    .withChildNodesLinearCollectionElementsSchema(EmployeeSchema())
                    .build()
                ]
            ])
        )
        .build()
}

export class UserProfile2 {
    public Name: string = ''
    public Age: number = 0
    public Country: string = ''
    public Occupation: string = ''
}

export function UserProfile2Schema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Object)
        .withTypeOf(typeof new UserProfile2())
        .withDefaultValue(() => {
            return new UserProfile2()
        })
        .withIsDefaultValueSet(true)
        .withChildNodes(
            new Map<string, Schema>([
                ['Name', DynamicSchemaNode.create()
                    .withKind(DataKinds.String)
                    .withTypeOf(typeof '')
                    .build()
                ],
                ['Age', DynamicSchemaNode.create()
                    .withKind(DataKinds.Number)
                    .withTypeOf(typeof 0)
                    .build()
                ],
                ['Country', DynamicSchemaNode.create()
                    .withKind(DataKinds.String)
                    .withTypeOf(typeof '')
                    .build()
                ],
                ['Occupation', DynamicSchemaNode.create()
                    .withKind(DataKinds.String)
                    .withTypeOf(typeof '')
                    .build()
                ]
            ])
        )
        .build()
}

export class Address {
    Street: string = ''
    City: string = ''
    ZipCode?: string
}

export function AddressSchema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Object)
        .withTypeOf(typeof new Address())
        .withDefaultValue(() => {
            return new Address()
        })
        .withIsDefaultValueSet(true)
        .withChildNodes(
            new Map<string, Schema>([
                ['Street', DynamicSchemaNode.create()
                    .withKind(DataKinds.String)
                    .withTypeOf(typeof '')
                    .build()
                ],
                ['City', DynamicSchemaNode.create()
                    .withKind(DataKinds.String)
                    .withTypeOf(typeof '')
                    .build()
                ],
                ['ZipCode', DynamicSchemaNode.create()
                    .withKind(DataKinds.String)
                    .withTypeOf(typeof '')
                    .withNullable(true)
                    .build()
                ]
            ])
        )
        .build()
}

export function DynamicUserSchema(): DynamicSchema {
    return DynamicSchema.create()
        .withDefaultSchemaNodeKey('UserWithAddress')
        .withNodes(
            new Map<string, DynamicSchemaNode>([
                ['User', UserSchema()],
                ['User2', User2Schema()],
                ['UserProfile', UserProfileSchema()],
                ['UserProfile2', UserProfile2Schema()],
                ['UserWithUuidID', UserWithUuidIdSchema()],
                ['UserWithAddress', UserWithAddressSchema()]
            ])
        )
        .build()
}

export class CustomUUID {
    private _uuid?: string

    private readonly _uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    private readonly _nullUUID: string = '00000000-0000-0000-0000-000000000000'

    get uuid(): string | undefined {
        return this._uuid
    }

    set uuid(value: string) {
        this._uuid = value
    }

    public IsEmptyorZero(): boolean {
        return !this._uuid || this._uuid === this._nullUUID
    }

    private constructor() {
        this._uuid = this._nullUUID
    }

    public static create(): CustomUUID {
        return new CustomUUID()
    }

    public withUUIDFromString(value: string): CustomUUID {
        if (!this._uuidRegex.test(value)) {
            throw new Error(`Invalid UUID format ${value}`)
        }
        this.uuid = value
        return this
    }

    public build(): CustomUUID {
        return this
    }
}

export class ComplexData {
    public ID: number = 0
    public Details: Map<string,any> = new Map()
    public Items: { Name: string; Value: number }[] = []
    public User: User = new User()
}

export function JsonMapSchema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Map)
        .withTypeOf(typeof new Map<string, any>())
        .withDefaultValue(() => {
            return new Map<string, any>()
        })
        .withChildNodesAssociativeCollectionEntriesKeySchema(DynamicSchemaNode.create()
            .withKind(DataKinds.String)
            .withTypeOf(typeof 'key')
            .build()
        )
        .withChildNodesAssociativeCollectionEntriesValueSchema(DynamicSchemaNode.create()
            .withKind(DataKinds.Any)
            .build())
        .build()
}

export function CustomUUIDSchema(): DynamicSchemaNode {
    return DynamicSchemaNode.create()
        .withKind(DataKinds.Object)
        .withTypeOf(typeof CustomUUID.create())
        .withDefaultValue(() => {
            return CustomUUID.create()
        })
        .withNullable(true)
        .withValidator(new CustomUUIDSchemaImplementation())
        .withConverter(new CustomUUIDSchemaImplementation())
        .build()
}

export class CustomUUIDSchemaImplementation implements Validator, Converter {
    private readonly uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    Convert(data: any, schema: Schema, pathSegments: RecursiveDescentSegment): any {
        const FunctionName = 'Convert'

        switch (typeof data) {
            case 'string':
                return CustomUUID.create().withUUIDFromString(data).build()
            default:
                throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `unsupported type ${typeof data}`, schema, data, pathSegments)
        }
    }

    ValidateData(data: any, schema: Schema, pathSegments: RecursiveDescentSegment): boolean {
        const FunctionName = 'ValidateData'

        switch (typeof data) {
            case 'string':
                return this.uuidRegex.test(data)
            case 'object':
                if (data instanceof CustomUUID) {
                    if (data.IsEmptyorZero()) {
                        throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `uuid is empty or zero`, schema, data, pathSegments)
                    }
                    return this.uuidRegex.test(data.uuid!)
                }
                throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `unsupported instance type ${data.constructor.name}`, schema, data, pathSegments)
            default:
                throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `unsupported type ${typeof data}`, schema, data, pathSegments)
        }
    }
}