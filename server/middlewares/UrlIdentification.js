import express from "express";
import jwt from "jsonwebtoken";

export async function getRedirectUrl(req) {
    const source = req.query.source || 'web';
    console.log("Source détectée dans la requête :", source);
    const baseUrl = source === 'mobile' ? "http://localhost:8085" : "http://localhost:8081";
    console.log("Base URL choisie pour la redirection :", baseUrl);
    return baseUrl;
}
