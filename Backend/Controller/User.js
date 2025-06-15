const express = require('express');
const {createClient} = require('redis');
const client = createClient();
const {otpgenrater} = require('./Services/otp');
const {emailsender} = require('./Services/email');
const Login = (req , res)=> {
    try{
    }catch(err){
        console.log(err);
    }
}
const signup = async function(req,res){
    try{
        const {name , email , university_name , domain , password} = req.body;
        if(!name || !email || !university_name || !domain || !password){
            return res.status(400).send({error: 'Please enter a all marked fields'});
        }
        if (!email.includes('@')){
            return res.status(400).send({error: 'Please enter a valid email'});
        }
        if (!email.includes('ac.in')){
            return res.status(400).send({error: 'Please enter an University email'});
        }
        const otp = otpgenrater();
        await emailsender(name , email , otp)
        const data = await client.create({name , email , university_name , domain , password , otp});
    }catch(err){
        console.log(err);
    }
}
module.exports = {Login , signup};