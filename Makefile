NAME=ElasticWolf
OSX=osx/Contents/Resources
SRC=js
VER=$(shell awk '{if($$1=="VERSION:"){gsub(/[\"\",;]+/,"",$$2);print $$2;}}' $(SRC)/chrome/content/client.js)

all:

run:
	osx/Contents/MacOS/xulrunner -jsconsole

dev:	clean
	ln -sf `pwd`/$(SRC)/chrome $(OSX)/chrome 
	ln -sf `pwd`/$(SRC)/defaults $(OSX)/defaults 
	ln -sf `pwd`/$(SRC)/application.ini $(OSX)/application.ini

build:	clean build_osx build_win

version:
	sed -E -i '' -e "s/^Version=.*$$/Version=$(VER)/" $(SRC)/application.ini
	sed -E -i '' -e "s/^Name=.*$$/Name=$(NAME)/" $(SRC)/application.ini
	sed -E -i '' -e "s/\\<em:version\\>([0-9\\.]*)\\<\\/em:version\\>/\\<em:version\\>$(VER)\\<\\/em:version\\>/" $(SRC)/install.rdf
	sed -E -i '' -e "s/\\<em:name\\>([^\\<]*)\\<\\/em:name\\>/\\<em:name\\>$(NAME)\\<\\/em:name\\>/" $(SRC)/install.rdf
	sed -E -i '' -e "s/NAME: '([^']+)',/NAME: '$(NAME)',/" $(SRC)/chrome/content/client.js

build_osx: clean_osx version
	rsync -a $(SRC)/application.ini $(SRC)/chrome $(SRC)/defaults $(OSX)
	mv osx $(NAME).app
	zip -rqy $(NAME)-osx-$(VER).zip $(NAME).app
	mv $(NAME).app osx

build_win: clean_win version
	rsync -a $(SRC)/application.ini $(SRC)/chrome $(SRC)/defaults win
	rsync -a win/xulrunner/xulrunner-stub.exe win/$(NAME).exe
	mv win $(NAME)
	zip -rq $(NAME)-win-$(VER).zip $(NAME)
	mv $(NAME) win

xpi:
	(cd $(SRC) && zip -rq ../$(NAME)-$(VER).zpi .)

clean: clean_osx clean_win
	rm -rf *.zip

clean_osx:
	rm -rf $(OSX)/chrome $(OSX)/defaults $(OSX)/application.ini

clean_win:
	rm -rf win/chrome win/defaults win/application.ini win/$(NAME).exe

