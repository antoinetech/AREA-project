db = db.getSiblingDB("my_database");

db.createUser({
    user: "noah",
    pwd: "password",
    roles: [
        {
            role: 'readWrite',
            db: 'my_database'
        },
    ],
});
