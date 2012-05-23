# ElasticWolf

ElasticWolf is an application for managing Amazon Web Services resources with a simple and
easy to use client-side UI.

This project is a fork of ElasticFox. It adds support for the GovCloud region, much better
VPC support, and many other enhancements. It is also packaged with all necessary tools and
utilities to deal with private and public keys and SSL certificates. In short, it provides
everything for an AWS user to get going without using the command line tools.

In addition, it integrates well with the AWS command line tools such that the user can
easily configure both ElasticWolf and the CLI to work together.

The project has been supported by the Global Public Sector sales team of AWS to provide a
better customer experience when using the new GovCloud (ITAR-compliant) AWS region.
GovClou is not currently supported by the AWS Console.  However, it is designed to work
with all regions, so please file bugs if you find problems in any region.

The Windows version of the tool is packaged with openssl for generating keys and ssh
clients for accessing Linux instances.

## Testing On Mac OS X

   *  Retrieve source code from the repository

       git clone git://github.com/aws-ew-dev/ElasticWolf.git

   * Primary development is done on Mac so there is a special dev mode to run it as
     an OS X application with symlinks to the actual source code

       make run

## Testing on On Windows

   * Download Git for Windows from http://code.google.com/p/msysgit/downloads/list

   * Once installed make sure command line tools are installed

   * Launch cmd.exe console and cd to the directory where you want to put the source code

   * Retrieve source code from the repository

       git clone git://github.com/aws-ew-dev/ElasticWolf.git

   * Run from the source directory the command, it will make a copy of the modified
     source files into the ElasticWolf windows directory 

       run.bat

## Building releases

 To create binary packages for Mac and Windows, just type

  make build

 it will produce two .zip files for each platform

## Passing credentials via command line

 The parameters are:

 * -key AWS Access key id
 * -secret - AWS Access Secret
 * -endpoint - URL for the endpoint
 * -name Name for passed credentials
 * -lock - lock the credentials and not allow to change it

## Developers:
  Vlad Seryakov

## QA and support:
 * Mark Ryland
 * Ben Butler
 * Tim Wilson

