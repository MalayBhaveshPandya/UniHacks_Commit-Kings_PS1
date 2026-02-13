const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"],
        },
        orgCode: {
            type: String,
            required: [true, "Organization code is required"],
            trim: true,
        },
        role: {
            type: String,
            enum: ["Admin", "Reviewer", "Member"],
            default: "Member",
        },
        jobTitle: {
            type: String,
            trim: true,
            default: "",
        },
        sex: {
            type: String,
            enum: ["Male", "Female", "Other", ""],
            default: "",
        },
    },
    { timestamps: true }
);

// --------------- Pre-save: hash password ---------------
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// --------------- Compare password ---------------
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// --------------- Generate JWT ---------------
userSchema.methods.generateAuthToken = function () {
    return jwt.sign(
        { id: this._id, role: this.role, orgCode: this.orgCode },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

// --------------- Strip password from JSON output ---------------
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    delete user.__v;
    return user;
};

module.exports = mongoose.model("User", userSchema);
