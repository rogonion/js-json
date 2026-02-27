export class User {
    public ID: number = 0;
    public Name: string = '';
    public Email: string = '';
}

export class Address {
    public Street: string = '';
    public City: string = '';
    public ZipCode: string | undefined = undefined;
}

export class ComplexData {
    public ID: number = 0;
    public Details: Map<string, any> = new Map();
    public Items: { Name: string; Value: number }[] = [];
    public User: User = new User();
}

export class UserProfile {
    public Name: string = '';
    public Age: number = 0;
    public Address: Address = new Address();
}
