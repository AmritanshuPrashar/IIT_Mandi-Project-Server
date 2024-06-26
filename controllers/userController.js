const userModel = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const maxAge = 3 * 24 * 60 * 60;

const createToken = (id) => {
	return jwt.sign({ id }, "veryHardPassword", {
		expiresIn: maxAge,
	});
};
const handleErrors = (err) => {
	console.log(err.message, err.code);
	let errors = { email: "", password: "" };
	if (err.code === 11000) {
		errors.email = "that email is already registered";
		return errors;
	}

	if (err.message.includes("user validation failed")) {
		Object.values(err.errors).forEach(({ properties }) => {
			errors[properties.path] = properties.message;
		});
	}

	return errors;
};

async function getAllUsers(req, res) {
	try {
		let users = await userModel.find();
		res.status(200).json({
			data: users,
		});
	} catch (err) {
		res.json({
			message: err.message,
		});
	}
}

async function signUp(req, res) {
	try {
		let body = req.body;
		const hashedPassword = await bcrypt.hash(body.password, 10);
        body.password = hashedPassword
        body.confirmPassword = hashedPassword
		let newUser = await userModel.create(body);
		const token = createToken(newUser._id);
		res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
		console.log("New Event : New user Created");
		console.log(newUser);
		res.status(201).json({
			newUser: newUser._id,
			message: "New User Created",
		});
	} catch (error) {
		const errors = handleErrors(error);
		res.status(400).json({ errors });
	}
}

async function login(req, res) {
	try {
		let body = req.body;
		let user = await userModel.findOne({ email: body.email });
		if (user) {
			const passwordMatch = await bcrypt.compare(body.password, user.password);
			if (passwordMatch) {
				const token = createToken(user._id);
				res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
				res.status(201).json({ user: user });
			} else {
				res.clearCookie("jwt");
				res.status(401).json({
					message: "Incorrect Password.",
				});
			}
		} else {
			res.clearCookie("jwt");
			res.status(401).json({
				message: "User not found.",
			});
		}
	} catch (error) {
		const errors = handleErrors(err);
		res.status(400).json({ errors });
	}
}

async function protectRoute(req, res, next) {
	try {
		let token;
		if (req.cookies.jwt) {
			token = req.cookies.jwt;
			let payload = jwt.verify(token, "veryHardPassword");
			// console.log(payload.id)
			if (payload) {
				const user = await userModel.findById(payload.id);
				req.body.role = user.role;
				req.body.id = user.id;
				next();
			} else {
				return res.status(401).json({
					message: "Login again.",
				});
			}
		} else {
			res.status(401).json({
				message: "Please Login",
			});
		}
	} catch (err) {
		return res.json({
			message: err.message,
		});
	}
}

const checkDataAccess = async (req, res, next) => {
	let token;
	if (req.cookies.jwt) {
		token = req.cookies.jwt;
		let payload = jwt.verify(token, "veryHardPassword");
		// console.log(payload.id)
		if (payload) {
			const user = await userModel.findById(payload.id);
			// console.log(user)
			if (user.dataAccess == true) next();
			else {
				res.status(401).json({
					message: "User have no data access",
				});
			}
		} else {
			return res.status(401).json({
				message: "Login again.",
			});
		}
	}
};

async function getUserProfile(req, res) {
	let id = req.body.id;
	let user = await userModel.findById(id);
	if (user) {
		return res.json(user);
	} else {
		res.json({
			message: "user not found",
		});
	}
}

async function deleteAll(req, res) {
	await userModel.deleteMany();

	res.json({
		message: "Users Deleted",
    });
}

const isAuthorised = (roles) => (req, res, next) => {
	if (roles.includes(req.body.role)) {
		next();
	} else {
		res.json({
			message: "User not authorised",
		});
	}
};

const revokeAccess = async (req, res) => {
	let userMail = req.body.email;
	let user = await userModel.findOne({ email: userMail });
	if (user) {
		if (user.role == "admin") {
			res.json({
				message: "You cannot revoke access of other admin.",
			});
		} else {
			if (user.dataAccess) {
				user.dataAccess = false;
				await user.save();
				res.status(200).json({
					message: "Data Access Revoked",
				});
			} else {
				res.status(200).json({
					message: "User already have no Access",
				});
			}
		}
	} else {
		res.status(404).json({
			message: "No user with this email address",
		});
	}
};

const giveAccess = async(req, res) => {
    let userMail = req.body.email;
    let user = await userModel.findOne({ email: userMail });
    if (user) {
        if (user.dataAccess) {
            res.status(200).json({
                message: "User already have data access"
            })
        }
        else {
            user.dataAccess = true;
            await user.save();
            res.status(200).json({
                message: "Data Access Given"
            })
        
        }
    }
    else {
        res.status(404).json({
            message: "No user with this email address",
        });
    }
}

module.exports = {
	signUp,
	getAllUsers,
	deleteAll,
	protectRoute,
	getUserProfile,
	login,
	isAuthorised,
	revokeAccess,
    checkDataAccess,
    giveAccess
};
