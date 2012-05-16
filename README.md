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

## Developing:

 Primary development is done on Mac so there is a special dev mode to run it as 
 an OS X application with symlink to actual source code

   make dev

 will make links and enables OS X app ready run. To launch, execute 

   make run

## Building:

 To create binary packages for Mac and Windows, just type

  make build

 it will produce to .zip files for each platform

## Developers:
  Vlad Seryakov

## QA and support:
 * Mark Ryland
 * Ben Butler
 * Tim Wilson

