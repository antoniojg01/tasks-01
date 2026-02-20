'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useAuth } from '@/firebase';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';


const signUpSchema = z.object({
    displayName: z.string().min(2, { message: "Display name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const signInSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(1, { message: "Password is required." }),
});

export function AuthForm() {
    const [authError, setAuthError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const auth = useAuth();
    
    const signInForm = useForm<z.infer<typeof signInSchema>>({
        resolver: zodResolver(signInSchema),
        defaultValues: { email: "", password: "" },
    });

    const signUpForm = useForm<z.infer<typeof signUpSchema>>({
        resolver: zodResolver(signUpSchema),
        defaultValues: { displayName: "", email: "", password: "" },
    });

    const handleAuthError = (error: any) => {
        setIsLoading(false);
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                setAuthError("Invalid email or password. Please try again.");
                break;
            case 'auth/email-already-in-use':
                setAuthError("An account with this email already exists.");
                break;
            case 'auth/weak-password':
                setAuthError("The password is too weak. Please use at least 6 characters.");
                break;
            case 'auth/invalid-email':
                setAuthError("The email address is not valid.");
                break;
            default:
                setAuthError("An unexpected error occurred. Please try again.");
                break;
        }
    };

    const onSignInSubmit = async (values: z.infer<typeof signInSchema>) => {
        setIsLoading(true);
        setAuthError(null);
        try {
            await signInWithEmailAndPassword(auth, values.email, values.password);
            // Auth state change is handled by the global provider
        } catch (error) {
            handleAuthError(error);
        }
    };

    const onSignUpSubmit = async (values: z.infer<typeof signUpSchema>) => {
        setIsLoading(true);
        setAuthError(null);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            if (userCredential.user) {
                await updateProfile(userCredential.user, {
                    displayName: values.displayName
                });
            }
             // Auth state change is handled by the global provider
        } catch (error) {
            handleAuthError(error);
        }
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Welcome to TaskFlow</CardTitle>
                <CardDescription>Sign in or create an account to continue</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="signin">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="signin">Sign In</TabsTrigger>
                        <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>
                    
                    {authError && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Authentication Error</AlertTitle>
                            <AlertDescription>{authError}</AlertDescription>
                        </Alert>
                    )}

                    <TabsContent value="signin" className="pt-4">
                         <Form {...signInForm}>
                            <form onSubmit={signInForm.handleSubmit(onSignInSubmit)} className="space-y-4">
                                <FormField control={signInForm.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl><Input placeholder="you@example.com" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={signInForm.control} name="password" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl><Input type="password" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? "Signing In..." : "Sign In"}
                                </Button>
                            </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="signup" className="pt-4">
                         <Form {...signUpForm}>
                            <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-4">
                                <FormField control={signUpForm.control} name="displayName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Display Name</FormLabel>
                                        <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={signUpForm.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl><Input placeholder="you@example.com" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={signUpForm.control} name="password" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl><Input type="password" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? "Creating Account..." : "Create Account"}
                                </Button>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
