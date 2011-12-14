NAME=ElasticWolf
OSX=osx/Contents/Resources
SRC=src
VER=$(shell awk '{if($$1=="VERSION:"){gsub(/[\"\",;]+/,"",$$2);print $$2;}}' $(SRC)/chrome/content/client.js)

all:

run:
	osx/Contents/MacOS/xulrunner -jsconsole

dev:	clean
	ln -sf `pwd`/$(SRC)/chrome $(OSX)/chrome 
	ln -sf `pwd`/$(SRC)/defaults $(OSX)/defaults 
	ln -sf `pwd`/$(SRC)/application.ini $(OSX)/application.ini
	ln -sf `pwd`/$(SRC)/osx.plist $(OSX)/../Info.plist
	ln -sf `pwd`/$(SRC)/osx.icns $(OSX)/NAME.icns

build:	clean build_osx build_win
	make dev

version:
	sed -E -i '' -e "s/^Version=.*$$/Version=$(VER)/" $(SRC)/application.ini
	sed -E -i '' -e "s/^Name=.*$$/Name=$(NAME)/" $(SRC)/application.ini
	sed -E -i '' -e "s/\\<em:version\\>([0-9\\.]*)\\<\\/em:version\\>/\\<em:version\\>$(VER)\\<\\/em:version\\>/" $(SRC)/install.rdf
	sed -E -i '' -e "s/\\<em:name\\>([^\\<]*)\\<\\/em:name\\>/\\<em:name\\>$(NAME)\\<\\/em:name\\>/" $(SRC)/install.rdf
	sed -E -i '' -e "s/NAME: '([^']+)',/NAME: '$(NAME)',/" $(SRC)/chrome/content/client.js

build_osx: clean_osx version
	rsync -a $(SRC)/application.ini $(SRC)/chrome $(SRC)/defaults $(OSX)
	rsync -a $(SRC)/osx.icns $(OSX)/$(NAME).icns
	sed -E -e "s/NAME/$(NAME)/" $(SRC)/osx.plist > $(OSX)/../Info.plist
	mv osx $(NAME).app
	zip -rqy ../$(NAME)-osx-$(VER).zip $(NAME).app
	mv $(NAME).app osx

build_win: clean_win version
	rsync -a $(SRC)/application.ini $(SRC)/chrome $(SRC)/defaults win
	rsync -u win/xulrunner/xulrunner-stub.exe win/$(NAME).exe
	mv win $(NAME)
	zip -rq ../$(NAME)-win-$(VER).zip $(NAME)
	mv $(NAME) win

xpi:
	(cd $(SRC) && zip -rq ../$(NAME)-$(VER).xpi .)

clean: clean_osx clean_win
	rm -rf *.zip

clean_osx:
	rm -rf $(OSX)/chrome $(OSX)/defaults $(OSX)/*.ini $(OSX)/../Info.plist $(OSX)/*.icns

clean_win:
	rm -rf win/chrome win/defaults win/application.ini


